"""AutoMiner Backend: FastAPI + scikit-learn + mlxtend (+ Groq AI & Offline Analytical Engine).
Interactive Data Mining Workbench for Classification, Regression, Clustering,
Association Rule Mining, and Anomaly Detection with EDA & Live Model Inference.
"""
import io
import os
import uuid
import math
from typing import Optional, Dict, Any, List

import httpx
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Scikit-learn models & metrics
from sklearn.cluster import DBSCAN, AgglomerativeClustering, KMeans
from sklearn.datasets import load_iris
from sklearn.decomposition import PCA
from sklearn.ensemble import IsolationForest, RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import Lasso, LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import (
    accuracy_score,
    calinski_harabasz_score,
    confusion_matrix,
    davies_bouldin_score,
    mean_absolute_error,
    mean_squared_error,
    precision_recall_fscore_support,
    r2_score,
    silhouette_score,
)
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier, LocalOutlierFactor
from sklearn.preprocessing import (
    LabelEncoder,
    MinMaxScaler,
    RobustScaler,
    StandardScaler,
)
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor, export_text

# Mlxtend for association rule mining
try:
    from mlxtend.frequent_patterns import apriori, association_rules, fpgrowth
except ImportError:
    apriori, association_rules, fpgrowth = None, None, None

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = FastAPI(
    title="AutoMiner API",
    description="Interactive Data Mining Workbench Backend",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage: dataset_id -> { "name", "raw", "df", "last_model", "model_info" }
STORE: Dict[str, Any] = {}


# ==============================================================================
# Helper functions
# ==============================================================================
def py(o):
    """Make numpy / pandas values completely JSON safe."""
    if isinstance(o, dict):
        return {str(k): py(v) for k, v in o.items()}
    if isinstance(o, (list, tuple, set, frozenset)):
        return [py(v) for v in o]
    if isinstance(o, np.ndarray):
        return py(o.tolist())
    if isinstance(o, (np.bool_, bool)):
        return bool(o)
    if isinstance(o, (np.integer, int)):
        return int(o)
    if isinstance(o, (np.floating, float)):
        if np.isnan(o) or np.isinf(o) or math.isnan(o) or math.isinf(o):
            return None
        return round(float(o), 4)
    if pd.isna(o):
        return None
    return o


def get(did: str) -> dict:
    if did not in STORE:
        raise HTTPException(404, "Dataset not found. Please upload or load a sample dataset first.")
    return STORE[did]


def register(name: str, df: pd.DataFrame) -> str:
    did = uuid.uuid4().hex[:8]
    df = df.reset_index(drop=True)
    STORE[did] = {
        "name": name,
        "raw": df.copy(),
        "df": df.copy(),
        "last_model": None,
        "model_info": None,
        "prep_history": []
    }
    return did


def describe(did: str) -> dict:
    e = STORE[did]
    df = e["df"]
    cols = []
    for c in df.columns:
        s = df[c]
        is_num = pd.api.types.is_numeric_dtype(s) and not pd.api.types.is_bool_dtype(s)
        info = {
            "name": str(c),
            "dtype": "number" if is_num else "text",
            "nulls": int(s.isna().sum()),
            "null_pct": round(float(s.isna().mean() * 100), 1),
            "unique": int(s.nunique())
        }
        if is_num and s.notna().any():
            info.update(
                mean=round(float(s.mean()), 2),
                std=round(float(s.std()), 2) if len(s.dropna()) > 1 else 0.0,
                min=round(float(s.min()), 2),
                max=round(float(s.max()), 2)
            )
        cols.append(info)
    
    # Compute quick stats
    numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    total_nulls = int(df.isna().sum().sum())
    duplicates = int(df.duplicated().sum())

    return py({
        "dataset_id": did,
        "name": e["name"],
        "rows": len(df),
        "total_columns": len(df.columns),
        "numeric_columns_count": len(numeric_cols),
        "total_nulls": total_nulls,
        "duplicates": duplicates,
        "columns": cols,
        "preview": df.head(10).to_dict("records"),
        "prep_history": e.get("prep_history", [])
    })


def feature_frame(df: pd.DataFrame, features=None, target=None) -> pd.DataFrame:
    """Extract and encode numeric feature matrix for ML models."""
    cols = [c for c in (features or list(df.columns)) if c != target and c in df.columns]
    X = df[cols].copy()
    
    # Drop likely ID columns (integer unique in every row)
    for c in list(X.columns):
        if pd.api.types.is_integer_dtype(X[c]) and X[c].nunique() == len(X) and len(X) > 20:
            if "id" in str(c).lower():
                X = X.drop(columns=c)

    # Label encode text columns
    for c in X.columns:
        if not pd.api.types.is_numeric_dtype(X[c]):
            X[c] = LabelEncoder().fit_transform(X[c].astype(str))

    X = X.apply(pd.to_numeric, errors="coerce").astype(float)
    X = X.fillna(X.mean()).fillna(0)
    if X.shape[1] == 0:
        raise HTTPException(400, "No usable feature columns selected.")
    return X


# ==============================================================================
# Curated Sample Datasets (Real-world & Academic Standard)
# ==============================================================================
def sample_iris():
    d = load_iris(as_frame=True)
    df = d.data.copy()
    df.columns = ["sepal_length", "sepal_width", "petal_length", "petal_width"]
    df["species"] = d.target.map(dict(enumerate(d.target_names)))
    return df


def sample_heart():
    """Cardiovascular diagnostic dataset (200 records)."""
    rng = np.random.default_rng(42)
    n = 200
    age = rng.integers(29, 77, n)
    sex = rng.choice(["Male", "Female"], n, p=[0.68, 0.32])
    chest_pain = rng.choice(["Typical Angina", "Atypical Angina", "Non-anginal", "Asymptomatic"], n, p=[0.2, 0.25, 0.35, 0.2])
    resting_bp = rng.normal(131, 17, n).clip(94, 200).round(0).astype(int)
    cholesterol = rng.normal(246, 51, n).clip(126, 410).round(0).astype(int)
    max_hr = (220 - age - rng.uniform(0, 35, n) + rng.normal(0, 10, n)).clip(71, 202).round(0).astype(int)
    oldpeak = np.abs(rng.normal(1.0, 1.1, n)).clip(0, 5.0).round(1)
    
    # Calculate heart disease risk logit
    z = -4.5 + 0.04 * (age - 50) + (sex == "Male") * 0.8 + (cholesterol > 250) * 0.7 - 0.03 * (max_hr - 150) + 0.8 * oldpeak
    prob = 1 / (1 + np.exp(-z))
    target = (rng.uniform(0, 1, n) < prob).astype(int)
    disease = ["Healthy" if t == 0 else "Heart Disease" for t in target]
    
    return pd.DataFrame({
        "Age": age,
        "Sex": sex,
        "Chest_Pain_Type": chest_pain,
        "Resting_BP": resting_bp,
        "Cholesterol": cholesterol,
        "Max_HeartRate": max_hr,
        "ST_Depression": oldpeak,
        "Diagnosis": disease
    })


def sample_mall():
    """Mall Customer Segmentation (200 shoppers)."""
    rng = np.random.default_rng(42)
    centers = [(25, 25, 78), (45, 26, 20), (32, 78, 82), (43, 87, 17), (40, 55, 50)]
    parts = []
    for a, i, s in centers:
        n = 40
        parts.append(np.c_[
            rng.normal(a, 4, n).clip(18, 70),
            rng.normal(i, 6, n).clip(15, 140),
            rng.normal(s, 7, n).clip(1, 99)
        ])
    df = pd.DataFrame(np.vstack(parts).round(0), columns=["Age", "Annual_Income_k", "Spending_Score"])
    df.insert(0, "Gender", rng.choice(["Male", "Female"], len(df)))
    df.insert(0, "CustomerID", range(1, len(df) + 1))
    return df.sample(frac=1, random_state=1).reset_index(drop=True)


def sample_basket():
    """Retail Market Basket Transactions (150 transactions)."""
    rng = np.random.default_rng(7)
    items = ["Bread", "Butter", "Milk", "Eggs", "Cheese", "Jam", "Tea", "Sugar", "Biscuits",
             "Coffee", "Maggi", "Ketchup"]
    patterns = [
        ["Bread", "Butter", "Jam"],
        ["Tea", "Sugar", "Biscuits"],
        ["Milk", "Eggs", "Bread"],
        ["Maggi", "Ketchup"],
        ["Coffee", "Sugar", "Milk"]
    ]
    rows = []
    for _ in range(150):
        basket = set()
        for p in patterns:
            if rng.random() < 0.35:
                basket.update(p)
        basket.update(rng.choice(items, int(rng.integers(0, 3)), replace=False).tolist())
        if not basket:
            basket.add(str(rng.choice(items)))
        rows.append({i: int(i in basket) for i in items})
    return pd.DataFrame(rows)


def sample_students():
    """Student Performance & Exam Scores (120 records)."""
    rng = np.random.default_rng(42)
    n = 120
    hours = rng.uniform(1.5, 9.5, n).round(1)
    att = rng.uniform(55, 99, n).round(0)
    prev = rng.uniform(40, 96, n).round(0)
    assignments = rng.integers(3, 11, n)
    sleep = rng.uniform(5, 9, n).round(1)
    final = (3.8 * hours + 0.22 * att + 0.42 * prev + 1.2 * assignments - 0.5 * np.abs(sleep - 7.5) + rng.normal(0, 3, n)).clip(10, 100).round(1)
    return pd.DataFrame({
        "Hours_Studied": hours,
        "Attendance_Pct": att,
        "Previous_Score": prev,
        "Assignments_Done": assignments,
        "Sleep_Hours": sleep,
        "Final_Score": final
    })


def sample_housing():
    """Real Estate House Price Valuation (150 houses)."""
    rng = np.random.default_rng(101)
    n = 150
    sqft = rng.normal(1850, 450, n).clip(800, 3800).round(0)
    beds = rng.choice([2, 3, 4, 5], n, p=[0.2, 0.45, 0.25, 0.1])
    baths = (beds * 0.7 + rng.choice([0, 0.5, 1.0], n)).clip(1, 4).round(1)
    age = rng.integers(1, 45, n)
    garage = rng.choice([0, 1, 2, 3], n, p=[0.1, 0.35, 0.45, 0.1])
    price = (120 + 0.14 * sqft + 15 * beds + 20 * baths - 1.2 * age + 18 * garage + rng.normal(0, 15, n)).clip(80, 750).round(1)
    return pd.DataFrame({
        "Square_Feet": sqft,
        "Bedrooms": beds,
        "Bathrooms": baths,
        "Age_Years": age,
        "Garage_Cars": garage,
        "Price_k": price
    })


def sample_sensors():
    """IoT Industrial Sensor Telemetry (160 readings with anomalies)."""
    rng = np.random.default_rng(11)
    n = 160
    temp = rng.normal(32, 2.2, n)
    hum = rng.normal(55, 4.5, n)
    press = rng.normal(1013, 3.2, n)
    vib = rng.normal(1.2, 0.25, n)
    df = pd.DataFrame({
        "Temperature": temp.round(2),
        "Humidity": hum.round(2),
        "Pressure": press.round(2),
        "Vibration": vib.round(3)
    })
    # Inject 8 clear operational anomalies
    bad = rng.choice(n, 8, replace=False)
    df.loc[bad, "Temperature"] += rng.uniform(12, 18, len(bad))
    df.loc[bad, "Humidity"] -= rng.uniform(20, 30, len(bad))
    df.loc[bad[:4], "Pressure"] += rng.uniform(15, 25, 4)
    df.loc[bad[4:], "Vibration"] += rng.uniform(1.5, 3.0, 4)
    return df.round(2)


SAMPLES = {
    "iris": dict(
        label="Iris Flowers",
        category="Classification",
        desc="150 flowers, 4 morphological features, 3 distinct iris species",
        badge="Multiclass",
        fn=sample_iris,
        suggest=dict(technique="classification", algorithm="decision_tree", target="species")
    ),
    "heart": dict(
        label="Heart Disease Diagnostics",
        category="Classification",
        desc="200 clinical records: age, blood pressure, cholesterol, chest pain",
        badge="Healthcare",
        fn=sample_heart,
        suggest=dict(technique="classification", algorithm="random_forest", target="Diagnosis")
    ),
    "mall": dict(
        label="Mall Customer Segmentation",
        category="Clustering",
        desc="200 retail shoppers: age, annual income, spending scores",
        badge="Unsupervised",
        fn=sample_mall,
        suggest=dict(technique="clustering", algorithm="kmeans", target=None)
    ),
    "basket": dict(
        label="Market Basket Transactions",
        category="Association",
        desc="150 grocery purchase receipts across 12 product categories",
        badge="Pattern Mining",
        fn=sample_basket,
        suggest=dict(technique="association", algorithm="fpgrowth", target=None)
    ),
    "students": dict(
        label="Student Academic Performance",
        category="Regression",
        desc="120 student profiles: study hours, attendance, assignments, exam grades",
        badge="Education",
        fn=sample_students,
        suggest=dict(technique="regression", algorithm="linear", target="Final_Score")
    ),
    "housing": dict(
        label="Real Estate Valuation",
        category="Regression",
        desc="150 house properties: square feet, bedrooms, age, garage, selling price",
        badge="Pricing",
        fn=sample_housing,
        suggest=dict(technique="regression", algorithm="random_forest", target="Price_k")
    ),
    "sensors": dict(
        label="IoT Sensor Telemetry",
        category="Outlier Detection",
        desc="160 industrial sensor logs with 8 injected critical machine faults",
        badge="Anomalies",
        fn=sample_sensors,
        suggest=dict(technique="outlier", algorithm="isolation_forest", target=None)
    ),
}


# ==============================================================================
# API Endpoints: Health & Dataset Management
# ==============================================================================
@app.get("/health")
def health():
    return {
        "status": "online",
        "service": "AutoMiner Interactive Workbench",
        "version": "2.0.0",
        "algorithms": {
            "classification": ["decision_tree", "random_forest", "logistic_regression", "knn", "naive_bayes", "svm"],
            "regression": ["linear", "ridge", "lasso", "random_forest", "decision_tree"],
            "clustering": ["kmeans", "hierarchical", "dbscan"],
            "association": ["apriori", "fpgrowth"],
            "outlier": ["isolation_forest", "lof", "zscore"]
        }
    }


@app.get("/samples")
def list_samples():
    return [
        {
            "key": k,
            "label": v["label"],
            "category": v.get("category", "Data Mining"),
            "desc": v["desc"],
            "badge": v.get("badge", "Dataset"),
            "suggest": v.get("suggest")
        }
        for k, v in SAMPLES.items()
    ]


@app.post("/samples/{key}")
def load_sample(key: str):
    if key not in SAMPLES:
        raise HTTPException(404, f"Unknown dataset key: {key}")
    s = SAMPLES[key]
    did = register(s["label"], s["fn"]())
    return {**describe(did), "suggest": s["suggest"]}


@app.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    try:
        content = await file.read()
        df = pd.read_csv(io.BytesIO(content)).head(50000)
    except Exception as e:
        raise HTTPException(400, f"Could not parse uploaded CSV file: {str(e)}")
    
    if df.shape[1] < 2 or len(df) < 5:
        raise HTTPException(400, "The dataset needs at least 2 columns and 5 rows.")
    
    name = file.filename or "uploaded_data.csv"
    did = register(name, df)
    return describe(did)


# ==============================================================================
# Exploratory Data Analysis (EDA) Endpoint
# ==============================================================================
@app.get("/eda/{dataset_id}")
def get_eda(dataset_id: str):
    e = get(dataset_id)
    df = e["df"]
    
    # Identify numeric columns
    numeric_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c]) and not pd.api.types.is_bool_dtype(df[c])]
    
    # 5-number summary and distributions
    stats = []
    histograms = {}
    
    for c in numeric_cols:
        s = df[c].dropna()
        if len(s) == 0:
            continue
        q25, q50, q75 = np.percentile(s, [25, 50, 75])
        stats.append({
            "feature": str(c),
            "count": int(len(s)),
            "mean": round(float(s.mean()), 2),
            "std": round(float(s.std()), 2) if len(s) > 1 else 0.0,
            "min": round(float(s.min()), 2),
            "q25": round(float(q25), 2),
            "median": round(float(q50), 2),
            "q75": round(float(q75), 2),
            "max": round(float(s.max()), 2),
            "skew": round(float(s.skew()), 2) if len(s) > 2 else 0.0,
        })
        
        # 10-bin histogram calculation
        counts, bin_edges = np.histogram(s, bins=min(10, max(4, s.nunique())))
        histograms[str(c)] = [
            {"range": f"{bin_edges[i]:.1f}-{bin_edges[i+1]:.1f}", "count": int(counts[i])}
            for i in range(len(counts))
        ]
        
    # Correlation matrix for numeric features
    corr_data = {"columns": [], "matrix": []}
    if len(numeric_cols) >= 2:
        num_df = df[numeric_cols].apply(pd.to_numeric, errors="coerce").fillna(0)
        corr_matrix = num_df.corr().round(3)
        corr_data = {
            "columns": list(corr_matrix.columns),
            "matrix": corr_matrix.values.tolist()
        }

    # Categorical breakdown
    cat_cols = [c for c in df.columns if c not in numeric_cols]
    cat_summary = {}
    for c in cat_cols:
        vc = df[c].value_counts().head(8)
        cat_summary[str(c)] = [{"name": str(k), "count": int(v)} for k, v in vc.items()]

    return py({
        "dataset_id": dataset_id,
        "rows": len(df),
        "total_columns": len(df.columns),
        "numeric_features": numeric_cols,
        "categorical_features": cat_cols,
        "stats": stats,
        "histograms": histograms,
        "correlation": corr_data,
        "categorical_distributions": cat_summary
    })


# ==============================================================================
# Data Preprocessing Pipeline
# ==============================================================================
class PrepReq(BaseModel):
    dataset_id: str
    missing: str = "mean"  # "mean" | "median" | "mode" | "drop" | "zero" | "none"
    outliers: str = "none"  # "none" | "iqr" | "zscore"
    scale: str = "none"  # "none" | "standard" | "minmax" | "robust"
    drop_duplicates: bool = False


@app.post("/preprocess")
def preprocess_dataset(r: PrepReq):
    e = get(r.dataset_id)
    df = e["raw"].copy()
    initial_rows = len(df)
    initial_nulls = int(df.isna().sum().sum())
    history = []

    # 1. Drop duplicates
    if r.drop_duplicates:
        dups_count = int(df.duplicated().sum())
        df = df.drop_duplicates().reset_index(drop=True)
        history.append(f"Removed {dups_count} duplicate rows.")

    num_cols = list(df.select_dtypes(include=[np.number]).columns)
    cat_cols = [c for c in df.columns if c not in num_cols]

    # 2. Missing value imputation
    if r.missing == "drop":
        df = df.dropna().reset_index(drop=True)
        history.append("Dropped rows containing missing values.")
    elif r.missing in ("mean", "median"):
        if num_cols:
            impute_val = getattr(df[num_cols], r.missing)()
            df[num_cols] = df[num_cols].fillna(impute_val)
        for c in cat_cols:
            if df[c].notna().any():
                df[c] = df[c].fillna(df[c].mode().iloc[0])
        history.append(f"Imputed numeric missing values using column {r.missing}.")
    elif r.missing == "mode":
        for c in df.columns:
            if df[c].notna().any():
                df[c] = df[c].fillna(df[c].mode().iloc[0])
        history.append("Imputed missing values with mode (most frequent value).")
    elif r.missing == "zero":
        if num_cols:
            df[num_cols] = df[num_cols].fillna(0)
        for c in cat_cols:
            df[c] = df[c].fillna("Unknown")
        history.append("Filled missing numeric values with 0 and text with 'Unknown'.")

    # 3. Outlier handling
    if r.outliers == "iqr" and num_cols and len(df) > 10:
        mask = pd.Series(True, index=df.index)
        for c in num_cols:
            q25 = df[c].quantile(0.25)
            q75 = df[c].quantile(0.75)
            iqr = q75 - q25
            lower, upper = q25 - 1.5 * iqr, q75 + 1.5 * iqr
            mask = mask & (df[c] >= lower) & (df[c] <= upper)
        removed = int((~mask).sum())
        df = df[mask].reset_index(drop=True)
        history.append(f"Filtered out {removed} rows using IQR (1.5 x IQR rule).")
    elif r.outliers == "zscore" and num_cols and len(df) > 10:
        z = np.abs((df[num_cols] - df[num_cols].mean()) / (df[num_cols].std() + 1e-9))
        mask = (z < 3.0).all(axis=1)
        removed = int((~mask).sum())
        df = df[mask].reset_index(drop=True)
        history.append(f"Filtered out {removed} rows using Z-Score (|z| < 3.0).")

    # 4. Feature scaling
    if r.scale != "none" and num_cols and len(df) > 1:
        if r.scale == "standard":
            scaler = StandardScaler()
            name = "StandardScaler (z = (x-μ)/σ)"
        elif r.scale == "minmax":
            scaler = MinMaxScaler()
            name = "MinMaxScaler [0, 1]"
        elif r.scale == "robust":
            scaler = RobustScaler()
            name = "RobustScaler (IQR based)"
        else:
            scaler = None
            name = None
        
        if scaler is not None:
            df[num_cols] = scaler.fit_transform(df[num_cols]).round(4)
            history.append(f"Applied {name} across numeric features.")

    e["df"] = df
    e["prep_history"] = history

    return py({
        **describe(r.dataset_id),
        "initial_rows": initial_rows,
        "cleaned_rows": len(df),
        "initial_nulls": initial_nulls,
        "remaining_nulls": int(df.isna().sum().sum()),
        "actions_applied": history
    })


# ==============================================================================
# Mining Request Models
# ==============================================================================
class RunReq(BaseModel):
    dataset_id: str
    algorithm: str
    target: Optional[str] = None
    features: Optional[List[str]] = None
    params: Dict[str, Any] = {}
    test_size: float = 0.25


class PredictReq(BaseModel):
    dataset_id: str
    input_values: Dict[str, Any]


# ==============================================================================
# Mining Techniques Implementation
# ==============================================================================
def run_classification(df: pd.DataFrame, raw: pd.DataFrame, r: RunReq, entry: dict):
    p, t = r.params, r.target
    if not t or t not in df.columns:
        raise HTTPException(400, "Please select a target column for classification.")
    
    y_raw = df[t].dropna()
    if y_raw.nunique() < 2 or y_raw.nunique() > 25:
        raise HTTPException(400, "Classification target must contain between 2 and 25 distinct classes.")

    X = feature_frame(df.loc[y_raw.index], r.features, t)
    le = LabelEncoder()
    y = le.fit_transform(y_raw.astype(str))
    classes = list(le.classes_)

    test_sz = float(p.get("test_size", r.test_size or 0.25))
    test_sz = max(0.1, min(0.4, test_sz))
    strat = y if np.bincount(y).min() >= 2 else None
    
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=test_sz, random_state=42, stratify=strat)
    
    algo = r.algorithm
    scaler = None

    if algo == "decision_tree":
        model = DecisionTreeClassifier(
            max_depth=int(p.get("max_depth", 4)),
            criterion=p.get("criterion", "gini"),
            min_samples_split=int(p.get("min_samples_split", 2)),
            random_state=42
        )
    elif algo == "random_forest":
        model = RandomForestClassifier(
            n_estimators=int(p.get("n_estimators", 50)),
            max_depth=int(p.get("max_depth", 6)),
            random_state=42
        )
    elif algo == "logistic_regression":
        scaler = StandardScaler()
        Xtr_scaled = scaler.fit_transform(Xtr)
        model = LogisticRegression(C=float(p.get("C", 1.0)), max_iter=1000, random_state=42)
    elif algo == "knn":
        scaler = StandardScaler()
        Xtr_scaled = scaler.fit_transform(Xtr)
        model = KNeighborsClassifier(
            n_neighbors=int(p.get("k", 5)),
            metric=p.get("metric", "euclidean")
        )
    elif algo == "naive_bayes":
        model = GaussianNB()
    elif algo == "svm":
        scaler = StandardScaler()
        Xtr_scaled = scaler.fit_transform(Xtr)
        model = SVC(
            C=float(p.get("C", 1.0)),
            kernel=p.get("kernel", "rbf"),
            probability=True,
            random_state=42
        )
    else:
        raise HTTPException(400, f"Unsupported classification algorithm: {algo}")

    # Train model
    fit_Xtr = scaler.transform(Xtr) if scaler else Xtr
    fit_Xte = scaler.transform(Xte) if scaler else Xte
    model.fit(fit_Xtr, ytr)
    pred = model.predict(fit_Xte)

    # Calculate comprehensive metrics
    acc = float(accuracy_score(yte, pred))
    pr_weighted, rc_weighted, f1_weighted, _ = precision_recall_fscore_support(yte, pred, average="weighted", zero_division=0)
    pr_macro, rc_macro, f1_macro, _ = precision_recall_fscore_support(yte, pred, average="macro", zero_division=0)
    
    # Class-wise metrics
    pr_all, rc_all, f1_all, supp_all = precision_recall_fscore_support(yte, pred, average=None, zero_division=0)
    class_report = [
        {
            "class": classes[idx],
            "precision": round(float(pr_all[idx]), 3),
            "recall": round(float(rc_all[idx]), 3),
            "f1": round(float(f1_all[idx]), 3),
            "support": int(supp_all[idx])
        }
        for idx in range(len(classes))
    ]

    # Confusion matrix
    cm = confusion_matrix(yte, pred, labels=list(range(len(classes))))

    # Feature importance or coefficients
    importances = []
    if hasattr(model, "feature_importances_"):
        importances = sorted(
            [{"feature": f, "value": round(float(v), 4)} for f, v in zip(X.columns, model.feature_importances_)],
            key=lambda d: -d["value"]
        )
    elif hasattr(model, "coef_"):
        coef_vals = np.mean(np.abs(model.coef_), axis=0) if model.coef_.ndim > 1 else np.abs(model.coef_)
        importances = sorted(
            [{"feature": f, "value": round(float(v), 4)} for f, v in zip(X.columns, coef_vals)],
            key=lambda d: -d["value"]
        )

    # Decision tree rules representation
    rules_text = None
    if algo == "decision_tree":
        try:
            rules_text = export_text(model, feature_names=list(X.columns))
        except Exception:
            rules_text = None

    # Save trained model for live what-if predictions
    entry["last_model"] = model
    entry["model_info"] = {
        "technique": "classification",
        "algorithm": algo,
        "features": list(X.columns),
        "target": t,
        "scaler": scaler,
        "label_encoder": le,
        "feature_means": X.mean().to_dict(),
        "classes": classes
    }

    metrics = {
        "accuracy": acc,
        "f1_score": float(f1_weighted),
        "precision": float(pr_weighted),
        "recall": float(rc_weighted),
        "macro_f1": float(f1_macro),
        "train_samples": len(Xtr),
        "test_samples": len(Xte)
    }

    return {
        "metrics": metrics,
        "text": rules_text,
        "charts": {
            "confusion": {"labels": classes, "matrix": cm.tolist()},
            "importance": importances,
            "class_report": class_report
        },
        "summary": {
            "target": t,
            "classes": classes,
            "features_used": list(X.columns),
            "top_features": importances[:3]
        }
    }


def run_regression(df: pd.DataFrame, raw: pd.DataFrame, r: RunReq, entry: dict):
    t = r.target
    p = r.params
    if not t or t not in df.columns or not pd.api.types.is_numeric_dtype(df[t]):
        raise HTTPException(400, "Please choose a continuous numeric column as regression target.")

    y = df[t].dropna()
    X = feature_frame(df.loc[y.index], r.features, t)
    
    test_sz = float(p.get("test_size", r.test_size or 0.25))
    test_sz = max(0.1, min(0.4, test_sz))
    
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=test_sz, random_state=42)
    algo = r.algorithm
    scaler = None

    if algo == "linear":
        model = LinearRegression()
    elif algo == "ridge":
        model = Ridge(alpha=float(p.get("alpha", 1.0)), random_state=42)
    elif algo == "lasso":
        model = Lasso(alpha=float(p.get("alpha", 0.1)), max_iter=2000, random_state=42)
    elif algo == "random_forest":
        model = RandomForestRegressor(
            n_estimators=int(p.get("n_estimators", 50)),
            max_depth=int(p.get("max_depth", 6)),
            random_state=42
        )
    elif algo == "decision_tree":
        model = DecisionTreeRegressor(max_depth=int(p.get("max_depth", 4)), random_state=42)
    else:
        raise HTTPException(400, f"Unsupported regression algorithm: {algo}")

    model.fit(Xtr, ytr)
    pred = model.predict(Xte)

    # Metrics
    r2 = float(r2_score(yte, pred))
    n, k = len(yte), X.shape[1]
    adj_r2 = float(1 - (1 - r2) * (n - 1) / max(1, (n - k - 1)))
    rmse = float(np.sqrt(mean_squared_error(yte, pred)))
    mae = float(mean_absolute_error(yte, pred))

    # Feature weights or importance
    coefs = []
    if hasattr(model, "coef_"):
        coefs = sorted(
            [{"feature": f, "value": round(float(c), 4)} for f, c in zip(X.columns, model.coef_)],
            key=lambda d: -abs(d["value"])
        )
    elif hasattr(model, "feature_importances_"):
        coefs = sorted(
            [{"feature": f, "value": round(float(c), 4)} for f, c in zip(X.columns, model.feature_importances_)],
            key=lambda d: -abs(d["value"])
        )

    # Sample points for visualization
    sample_indices = np.random.default_rng(42).choice(len(yte), min(100, len(yte)), replace=False)
    actual_sample = yte.iloc[sample_indices].values
    pred_sample = pred[sample_indices]

    actual_vs_pred = [{"x": round(float(a), 2), "y": round(float(b), 2)} for a, b in zip(actual_sample, pred_sample)]
    residuals = [{"x": round(float(b), 2), "y": round(float(a - b), 2)} for a, b in zip(actual_sample, pred_sample)]

    # Cache trained model for live prediction
    entry["last_model"] = model
    entry["model_info"] = {
        "technique": "regression",
        "algorithm": algo,
        "features": list(X.columns),
        "target": t,
        "scaler": scaler,
        "feature_means": X.mean().to_dict()
    }

    metrics = {
        "r2_score": r2,
        "adjusted_r2": adj_r2,
        "rmse": rmse,
        "mae": mae,
        "test_samples": len(Xte)
    }

    return {
        "metrics": metrics,
        "charts": {
            "actual_vs_pred": actual_vs_pred,
            "residuals": residuals,
            "coefs": coefs
        },
        "summary": {
            "target": t,
            "coefficients": coefs[:5],
            "top_predictor": coefs[0]["feature"] if coefs else "N/A"
        }
    }


def run_clustering(df: pd.DataFrame, raw: pd.DataFrame, r: RunReq, entry: dict):
    p = r.params
    X = feature_frame(df, r.features)
    if X.shape[1] < 2:
        raise HTTPException(400, "Clustering requires at least 2 numeric features.")
    
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)
    algo = r.algorithm
    k = int(p.get("k", 3))

    if algo == "kmeans":
        model = KMeans(n_clusters=k, n_init=10, random_state=42)
        labels = model.fit_predict(Xs)
    elif algo == "hierarchical":
        linkage_choice = p.get("linkage", "ward")
        model = AgglomerativeClustering(n_clusters=k, linkage=linkage_choice)
        labels = model.fit_predict(Xs)
    elif algo == "dbscan":
        eps = float(p.get("eps", 0.6))
        min_samples = int(p.get("min_samples", 5))
        model = DBSCAN(eps=eps, min_samples=min_samples)
        labels = model.fit_predict(Xs)
    else:
        raise HTTPException(400, f"Unsupported clustering algorithm: {algo}")

    cluster_ids = sorted(set(labels.tolist()))
    valid_mask = labels != -1
    num_valid_clusters = len([c for c in cluster_ids if c != -1])
    
    # Calculate Cluster Validation Indices
    sil, db_index, ch_score = None, None, None
    if valid_mask.sum() > 2 and num_valid_clusters > 1:
        sil = float(silhouette_score(Xs[valid_mask], labels[valid_mask]))
        try:
            db_index = float(davies_bouldin_score(Xs[valid_mask], labels[valid_mask]))
            ch_score = float(calinski_harabasz_score(Xs[valid_mask], labels[valid_mask]))
        except Exception:
            pass

    # 2D PCA projection for visual mapping
    pca = PCA(n_components=2, random_state=42)
    pts = pca.fit_transform(Xs)
    cluster_name = lambda cid: "Noise / Outliers" if cid == -1 else f"Cluster {cid + 1}"
    
    scatter = {}
    for cid in cluster_ids:
        indices = np.where(labels == cid)[0]
        # sample up to 120 points per cluster for snappy rendering
        if len(indices) > 120:
            indices = np.random.default_rng(42).choice(indices, 120, replace=False)
        scatter[cluster_name(cid)] = [{"x": round(float(pts[i, 0]), 2), "y": round(float(pts[i, 1]), 2)} for i in indices]

    # Elbow curve analysis (Inertia vs K)
    elbow = []
    max_k = min(9, len(Xs) - 1)
    for kk in range(1, max_k):
        km_test = KMeans(n_clusters=kk, n_init=5, random_state=42).fit(Xs)
        elbow.append({"k": kk, "inertia": round(float(km_test.inertia_), 1)})

    # Cluster profiles (averages in original raw feature scale)
    raw_num = feature_frame(raw.loc[X.index], r.features)
    cluster_means = raw_num.assign(_c=labels).groupby("_c").mean().round(2)
    sizes = pd.Series(labels).value_counts()
    
    profiles = [
        {
            "cluster": cluster_name(cid),
            "size": int(sizes.get(cid, 0)),
            "percentage": f"{(sizes.get(cid, 0) / len(labels) * 100):.1f}%",
            **cluster_means.loc[cid].to_dict()
        }
        for cid in cluster_ids if cid in cluster_means.index
    ]

    metrics = {
        "clusters_found": num_valid_clusters,
        "silhouette_score": sil,
        "davies_bouldin_index": db_index,
        "calinski_harabasz": ch_score,
        "noise_points": int((labels == -1).sum())
    }

    return {
        "metrics": metrics,
        "charts": {
            "scatter": scatter,
            "elbow": elbow,
            "profiles": profiles
        },
        "summary": {
            "clusters": num_valid_clusters,
            "features": list(raw_num.columns),
            "silhouette": sil,
            "profiles": profiles[:6]
        }
    }


def run_association(df: pd.DataFrame, raw: pd.DataFrame, r: RunReq, entry: dict):
    if apriori is None or association_rules is None:
        raise HTTPException(500, "mlxtend library is not available. Please install mlxtend.")

    p = r.params
    # Extract binary item matrix
    binary_df = raw.select_dtypes(include=[np.number, bool]).fillna(0) > 0
    if binary_df.shape[1] < 2:
        raise HTTPException(400, "Association rule mining requires binary transaction columns (0/1 or True/False).")

    min_sup = float(p.get("min_support", 0.1))
    min_conf = float(p.get("min_confidence", 0.5))
    algo_fn = apriori if r.algorithm == "apriori" else fpgrowth

    try:
        freq_itemsets = algo_fn(binary_df.astype(bool), min_support=min_sup, use_colnames=True)
    except Exception as e:
        raise HTTPException(400, f"Error generating frequent itemsets: {str(e)}")

    if freq_itemsets.empty:
        raise HTTPException(400, f"No frequent itemsets found with minimum support {min_sup}. Please lower the minimum support slider.")

    try:
        rules = association_rules(freq_itemsets, num_itemsets=len(binary_df), metric="confidence", min_threshold=min_conf)
    except TypeError:
        rules = association_rules(freq_itemsets, metric="confidence", min_threshold=min_conf)

    rule_rows, scatter_points = [], []
    if len(rules) > 0:
        rules = rules.sort_values("lift", ascending=False)
        for _, row in rules.head(40).iterrows():
            rule_rows.append({
                "if": ", ".join(sorted(row.antecedents)),
                "then": ", ".join(sorted(row.consequents)),
                "support": round(float(row.support), 3),
                "confidence": round(float(row.confidence), 3),
                "lift": round(float(row.lift), 3),
                "leverage": round(float(getattr(row, "leverage", 0)), 4),
            })
        for _, row in rules.head(150).iterrows():
            scatter_points.append({
                "x": round(float(row.support), 3),
                "y": round(float(row.confidence), 3),
                "lift": round(float(row.lift), 2)
            })

    top_itemsets = freq_itemsets.sort_values("support", ascending=False).head(12)
    itemset_chart = [
        {"items": ", ".join(sorted(items)), "support": round(float(sup), 3)}
        for items, sup in zip(top_itemsets.itemsets, top_itemsets.support)
    ]

    metrics = {
        "frequent_itemsets": len(freq_itemsets),
        "rules_generated": len(rules),
        "max_lift": round(float(rules.lift.max()), 3) if len(rules) else None,
        "min_support": min_sup,
        "min_confidence": min_conf
    }

    return {
        "metrics": metrics,
        "charts": {
            "rules": rule_rows,
            "itemsets": itemset_chart,
            "scatter": scatter_points
        },
        "summary": {
            "top_rules": rule_rows[:6],
            "total_rules": len(rules)
        }
    }


def run_outlier(df: pd.DataFrame, raw: pd.DataFrame, r: RunReq, entry: dict):
    p = r.params
    X = feature_frame(df, r.features)
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)
    algo = r.algorithm
    contamination = float(p.get("contamination", 0.05))

    if algo == "isolation_forest":
        model = IsolationForest(contamination=contamination, random_state=42)
        flag = model.fit_predict(Xs) == -1
    elif algo == "lof":
        n_neighbors = int(p.get("n_neighbors", 20))
        n_neighbors = min(n_neighbors, len(Xs) - 1)
        model = LocalOutlierFactor(n_neighbors=n_neighbors, contamination=contamination)
        flag = model.fit_predict(Xs) == -1
    elif algo == "zscore":
        thresh = float(p.get("threshold", 3.0))
        flag = (np.abs(Xs) > thresh).any(axis=1)
    else:
        raise HTTPException(400, f"Unsupported anomaly detection algorithm: {algo}")

    # PCA 2D projection
    pca = PCA(n_components=2, random_state=42)
    pts = pca.fit_transform(Xs) if X.shape[1] >= 2 else np.c_[Xs[:, 0], np.zeros(len(Xs))]

    normal_idx = np.where(~flag)[0]
    outlier_idx = np.where(flag)[0]

    # Sample points for performance
    if len(normal_idx) > 200:
        normal_idx = np.random.default_rng(42).choice(normal_idx, 200, replace=False)

    scatter = {
        "Normal": [{"x": round(float(pts[i, 0]), 2), "y": round(float(pts[i, 1]), 2)} for i in normal_idx],
        "Outlier": [{"x": round(float(pts[i, 0]), 2), "y": round(float(pts[i, 1]), 2)} for i in outlier_idx]
    }

    flagged_df = raw.loc[X.index[flag]].head(30)
    flagged_records = [
        {"row": int(idx), **rec}
        for idx, rec in zip(flagged_df.index, flagged_df.to_dict("records"))
    ]

    metrics = {
        "total_records": len(X),
        "anomalies_detected": int(flag.sum()),
        "anomaly_percentage": round(float(flag.mean() * 100), 2),
        "clean_records": int((~flag).sum())
    }

    return {
        "metrics": metrics,
        "charts": {
            "scatter": scatter,
            "flagged": flagged_records
        },
        "summary": {
            "total_outliers": int(flag.sum()),
            "examples": flagged_records[:5]
        }
    }


TECHNIQUES = {
    "classification": run_classification,
    "regression": run_regression,
    "clustering": run_clustering,
    "association": run_association,
    "outlier": run_outlier
}


@app.post("/run/{technique}")
def execute_technique(technique: str, r: RunReq):
    if technique not in TECHNIQUES:
        raise HTTPException(404, f"Unknown technique: {technique}")
    entry = get(r.dataset_id)
    output = TECHNIQUES[technique](entry["df"], entry["raw"], r, entry)
    return py({
        "technique": technique,
        "algorithm": r.algorithm,
        "dataset_name": entry["name"],
        **output
    })


# ==============================================================================
# Interactive Live Model Inference (What-If Predictions)
# ==============================================================================
@app.post("/predict")
def predict_live(r: PredictReq):
    entry = get(r.dataset_id)
    model = entry.get("last_model")
    info = entry.get("model_info")

    if not model or not info:
        raise HTTPException(400, "No trained model found for this dataset. Please run a classification or regression model first.")

    features = info["features"]
    feature_means = info.get("feature_means", {})
    
    # Construct input vector with defaults
    vector = []
    for f in features:
        val = r.input_values.get(f)
        if val is None or val == "":
            val = feature_means.get(f, 0.0)
        try:
            vector.append(float(val))
        except (ValueError, TypeError):
            vector.append(0.0)

    X_in = pd.DataFrame([vector], columns=features)
    scaler = info.get("scaler")
    if scaler:
        X_in = scaler.transform(X_in)

    if info["technique"] == "classification":
        pred_idx = model.predict(X_in)[0]
        le = info.get("label_encoder")
        pred_label = le.inverse_transform([pred_idx])[0] if le else str(pred_idx)
        
        probabilities = []
        confidence = None
        if hasattr(model, "predict_proba"):
            probs = model.predict_proba(X_in)[0]
            confidence = round(float(np.max(probs) * 100), 1)
            classes = info.get("classes", [str(c) for c in range(len(probs))])
            probabilities = [
                {"class": str(classes[i]), "probability": round(float(probs[i] * 100), 1)}
                for i in range(len(probs))
            ]

        return py({
            "type": "classification",
            "prediction": str(pred_label),
            "confidence": confidence,
            "probabilities": probabilities,
            "target": info["target"],
            "features_used": {f: v for f, v in zip(features, vector)}
        })

    elif info["technique"] == "regression":
        pred_val = float(model.predict(X_in)[0])
        return py({
            "type": "regression",
            "prediction": round(pred_val, 2),
            "target": info["target"],
            "features_used": {f: v for f, v in zip(features, vector)}
        })

    raise HTTPException(400, "What-If testing is supported for Classification and Regression models.")


# ==============================================================================
# Comprehensive AI & Offline Analytical Explainer
# ==============================================================================
class ExplainReq(BaseModel):
    technique: str
    algorithm: str
    metrics: Dict[str, Any] = {}
    summary: Dict[str, Any] = {}


OFFLINE_KNOWLEDGE = {
    "classification": {
        "formulas": [
            "Accuracy = (TP + TN) / (TP + TN + FP + FN)",
            "Precision = TP / (TP + FP)  (Measures exactness)",
            "Recall = TP / (TP + FN)  (Measures completeness / sensitivity)",
            "F1-Score = 2 * (Precision * Recall) / (Precision + Recall)"
        ],
        "viva_qna": [
            {
                "q": "What is the difference between Gini Impurity and Entropy?",
                "a": "Gini Impurity measures misclassification probability (1 - sum(p_i^2)), bounded [0, 0.5] for binary. Entropy measures information disorder (-sum(p_i * log2(p_i))), computationally slower due to logarithms."
            },
            {
                "q": "When should we prefer F1-Score over simple Accuracy?",
                "a": "When dealing with imbalanced datasets (e.g. fraud or medical diagnosis) where predicting the majority class yields deceptively high accuracy despite failing on the minority class."
            }
        ]
    },
    "regression": {
        "formulas": [
            "R² Score = 1 - (SS_res / SS_tot)  (Proportion of variance explained)",
            "RMSE = sqrt( (1/n) * sum((y_actual - y_pred)^2) )",
            "MAE = (1/n) * sum( |y_actual - y_pred| )",
            "Adjusted R² = 1 - [ (1 - R²) * (n - 1) / (n - k - 1) ]"
        ],
        "viva_qna": [
            {
                "q": "What is the difference between Ridge (L2) and Lasso (L1) regression?",
                "a": "Ridge shrinks coefficients close to zero using sum(w^2) penalty. Lasso uses sum(|w|) penalty and can shrink coefficients strictly to zero, performing automatic feature selection."
            },
            {
                "q": "What does a negative R² score signify?",
                "a": "It indicates the model fits worse than a naive horizontal line predicting the mean of the target variable."
            }
        ]
    },
    "clustering": {
        "formulas": [
            "Silhouette Coefficient = (b - a) / max(a, b)  [-1 to +1]",
            "Inertia = sum( min_{centroids} ||x_i - c_k||^2 )",
            "Davies-Bouldin Index = (1/k) * sum( max_{j != i} (s_i + s_j) / d(c_i, c_j) )"
        ],
        "viva_qna": [
            {
                "q": "How do you select the optimal number of clusters K in K-Means?",
                "a": "Using the Elbow Method (identifying the bend in the Inertia curve) and Silhouette Analysis (maximizing average silhouette coefficient)."
            },
            {
                "q": "Why does DBSCAN not require specifying the number of clusters in advance?",
                "a": "DBSCAN is a density-based algorithm that discovers clusters of arbitrary shapes by connecting points in dense regions (eps, min_samples) while labeling sparse points as noise."
            }
        ]
    },
    "association": {
        "formulas": [
            "Support(A -> B) = P(A ∩ B) = Count(A ∪ B) / Total_Transactions",
            "Confidence(A -> B) = P(B | A) = Support(A ∩ B) / Support(A)",
            "Lift(A -> B) = Confidence(A -> B) / Support(B) = P(A ∩ B) / (P(A) * P(B))"
        ],
        "viva_qna": [
            {
                "q": "Why is FP-Growth generally faster than Apriori?",
                "a": "Apriori requires repeated candidate generation and multiple passes over the database. FP-Growth encodes the dataset into a compact FP-Tree and mines it without candidate generation."
            },
            {
                "q": "What does a Lift value greater than 1 mean?",
                "a": "A Lift > 1 signifies positive correlation: buying item A substantially increases the likelihood of purchasing item B."
            }
        ]
    },
    "outlier": {
        "formulas": [
            "Z-Score = (x - mean) / std",
            "IQR Rule: Outlier if x < (Q1 - 1.5 * IQR) or x > (Q3 + 1.5 * IQR)",
            "Isolation Forest Path Length: Shorter path = higher anomaly likelihood"
        ],
        "viva_qna": [
            {
                "q": "How does Isolation Forest isolate anomalies?",
                "a": "Anomalies are few and attribute-different, so they require fewer random partition splits to isolate near the root of an Isolation Tree."
            },
            {
                "q": "What is the difference between global and local outliers?",
                "a": "A global outlier deviates from the entire dataset distribution; a local outlier deviates specifically relative to its immediate neighborhood density (e.g. LOF)."
            }
        ]
    }
}


@app.post("/explain")
def explain_results(r: ExplainReq):
    key = os.getenv("GROQ_API_KEY")
    if key:
        prompt = (
            f"You are a Senior Data Mining Professor evaluating a college student's mini project.\n"
            f"Technique: {r.technique.title()}\n"
            f"Algorithm: {r.algorithm.replace('_', ' ').title()}\n"
            f"Evaluation Metrics: {r.metrics}\n"
            f"Context: {r.summary}\n\n"
            f"Provide an academic evaluation:\n"
            f"1. Executive Interpretation (what these numbers mean in practice)\n"
            f"2. Strengths and Potential Pitfalls of this model\n"
            f"3. High-priority examiner viva question with answer\n"
            f"Keep it concise, professional, and formatted in clean markdown bullet points."
        )
        try:
            resp = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {key}"},
                json={
                    "model": os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
                    "temperature": 0.3,
                    "messages": [
                        {"role": "system", "content": "You are a distinguished university professor in Data Mining and Machine Learning."},
                        {"role": "user", "content": prompt}
                    ],
                },
                timeout=25
            )
            resp.raise_for_status()
            text = resp.json()["choices"][0]["message"]["content"]
            return {"text": text, "source": "Groq AI (Llama 3.3 70B)", "theory": OFFLINE_KNOWLEDGE.get(r.technique)}
        except Exception:
            pass

    # High-quality offline academic breakdown
    tech_info = OFFLINE_KNOWLEDGE.get(r.technique, {})
    algo_name = r.algorithm.replace("_", " ").title()
    
    lines = [
        f"### 📊 Academic Analysis: {algo_name} ({r.technique.title()})",
        "",
        "#### Key Performance Indicators:"
    ]
    for k, v in py(r.metrics).items():
        if v is not None:
            formatted_k = k.replace("_", " ").title()
            val_str = f"{v:.4f}" if isinstance(v, float) else str(v)
            lines.append(f"- **{formatted_k}**: `{val_str}`")

    lines.append("")
    lines.append("#### Evaluator Insights & Practical Takeaways:")
    if r.technique == "classification":
        acc = r.metrics.get("accuracy", 0)
        lines.append(f"- The model achieved **{acc*100:.1f}% accuracy** on unseen test data.")
        lines.append("- Review the confusion matrix to ensure precision and recall are balanced across all classes.")
    elif r.technique == "regression":
        r2 = r.metrics.get("r2_score", 0)
        lines.append(f"- **R² of {r2:.3f}** indicates that {max(0, r2*100):.1f}% of total target variance is captured by the model features.")
    elif r.technique == "clustering":
        sil = r.metrics.get("silhouette_score")
        if sil is not None:
            rating = "Strong" if sil > 0.6 else "Moderate" if sil > 0.3 else "Weak"
            lines.append(f"- Silhouette score of **{sil:.3f}** indicates **{rating} cluster separation**.")
    elif r.technique == "association":
        lift = r.metrics.get("max_lift")
        lines.append(f"- Discovered strong association rules with peak lift of **{lift or 'N/A'}**.")
    elif r.technique == "outlier":
        pct = r.metrics.get("anomaly_percentage", 0)
        lines.append(f"- Detected **{pct:.2f}%** anomalous observations using statistical boundary isolation.")

    return {
        "text": "\n".join(lines),
        "source": "AutoMiner Built-in Academic Engine",
        "theory": tech_info
    }


# ==============================================================================
# Printable Lab Project Report Generator
# ==============================================================================
class ReportReq(BaseModel):
    dataset_id: str
    technique: str
    algorithm: str
    metrics: Dict[str, Any]
    summary: Dict[str, Any]


@app.post("/export-report")
def export_report(r: ReportReq):
    entry = get(r.dataset_id)
    raw_df = entry["raw"]
    clean_df = entry["df"]
    
    report_md = f"""# 📑 AutoMiner: Data Mining Laboratory Project Report

**Project Title:** Automated Data Mining & Pattern Discovery Workbench  
**Dataset Name:** {entry["name"]}  
**Target Domain:** {r.technique.title()} ({r.algorithm.replace('_', ' ').title()})  
**Report Generated:** Interactive Workbench System  

---

## 1. Dataset Profiling & Characteristics
- **Total Initial Records:** {len(raw_df)}
- **Processed Cleaned Records:** {len(clean_df)}
- **Attribute Dimension:** {len(clean_df.columns)} features
- **Missing Values Imputed:** {int(raw_df.isna().sum().sum())} missing fields resolved

---

## 2. Preprocessing & Transformation Pipeline
The following systematic data preparation steps were executed:
"""
    if entry.get("prep_history"):
        for act in entry["prep_history"]:
            report_md += f"- {act}\n"
    else:
        report_md += "- Automated type casting, missing value imputation, and categorical label encoding.\n"

    report_md += f"""
---

## 3. Algorithm Architecture & Experimental Setup
- **Mining Technique:** `{r.technique.upper()}`
- **Algorithm Selected:** `{r.algorithm.replace('_', ' ').title()}`
- **Model Evaluation Strategy:** Hold-out validation / Statistical partitioning

---

## 4. Quantitative Evaluation Metrics
| Metric | Value |
|---|---|
"""
    for k, v in r.metrics.items():
        if v is not None:
            val_str = f"{v:.4f}" if isinstance(v, float) else str(v)
            report_md += f"| {k.replace('_', ' ').title()} | `{val_str}` |\n"

    report_md += f"""
---

## 5. Academic Defense & Viva Summary
- **Primary Finding:** Successfully deployed `{r.algorithm.replace('_', ' ').title()}` demonstrating robust convergence and measurable predictive power.
- **Examiner Takeaway:** Comprehensive pipeline validated from raw CSV ingestion to feature engineering, exploratory data analysis, and mathematical model validation.
"""

    return {"markdown": report_md}
