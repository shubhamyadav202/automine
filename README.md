# 🚀 AutoMiner Pro: Next-Gen Interactive Data Mining & Machine Learning Workbench

**AutoMiner Pro** is a comprehensive, production-grade, full-stack Data Mining and Machine Learning Workbench engineered for academic laboratory evaluations, viva presentations, and practical data science experiments.

Built with **FastAPI**, **React 18**, **scikit-learn**, **mlxtend**, and **Recharts**, it delivers a seamless end-to-end interactive workflow spanning Exploratory Data Analysis (EDA), automated data cleaning and preprocessing, algorithm training and hyperparameter tuning, visual model diagnostics, real-time "What-If" inference, and automated academic report generation.

---

## 🌟 Key Highlights for Academic & Mini-Project Evaluation

### 1. 📊 Exploratory Data Analysis (EDA) Hub
- **Column Profiling:** Automatic type inference, null counts, null percentages, unique cardinalities, min, 25%, median, mean, 75%, max, and standard deviation.
- **Pairwise Pearson Correlation Heatmap:** Color-graded dynamic matrix from -1.0 to +1.0 for all numeric dimensions.
- **Interactive Frequency Histograms:** 10-bin distribution frequency charts for continuous attributes.
- **Raw Data Browser:** Searchable data table with instant keyword filtering.

### 2. 🧹 Systematic Data Preprocessing & Feature Engineering
- **Missing Value Imputation:** Mean (continuous), Mode (categorical), Median (robust to outliers), Constant 0/'Unknown', or Row Deletion.
- **Outlier Filtering:** Statistical $1.5 \times \text{IQR}$ rule or Z-Score ($|z| < 3.0$) truncation.
- **Feature Scaling:** StandardScaler ($z = \frac{x-\mu}{\sigma}$), MinMaxScaler ($[0, 1]$), or RobustScaler.
- **Duplicate Removal:** Automated deduplication with record shift tracking.

### 3. 🧠 Comprehensive Machine Learning & Mining Algorithms
| Module | Supported Algorithms | Evaluation Metrics & Visuals |
|---|---|---|
| **Classification** | Random Forest, Decision Tree, Logistic Regression, K-Nearest Neighbors (KNN), Gaussian Naive Bayes, Support Vector Machine (SVM) | Accuracy, Weighted & Macro F1, Precision, Recall, Confusion Matrix Heatmap, Feature Importances, Decision Tree Rules |
| **Regression** | Ordinary Least Squares (OLS), Ridge (L2), Lasso (L1), Random Forest Regressor, Decision Tree Regressor | $R^2$, Adjusted $R^2$, RMSE, MAE, Actual vs Predicted Scatter, Residual Error Plot, Feature Coefficients |
| **Clustering** | K-Means, Hierarchical Agglomerative (Ward, Complete, Average), DBSCAN | Silhouette Score, Davies-Bouldin Index, Calinski-Harabasz Index, 2D PCA Cluster Map, Elbow Inertia Plot, Cluster Profiles |
| **Association Rules** | FP-Growth (FP-Tree), Apriori | Antecedents, Consequents, Support %, Confidence %, Lift, Leverage, Itemset Frequencies, Rule Scatter |
| **Outlier Detection** | Isolation Forest, Local Outlier Factor (LOF), Z-Score Threshold | Anomaly Percentage, Normal vs Outlier 2D PCA Map, Flagged Anomaly Records with Attribute Deviations |

### 4. 🔮 Interactive What-If Live Inference Simulator
- Directly test trained models by adjusting feature sliders or entering numeric inputs.
- Real-time prediction output with confidence scores and class probability distribution bar charts.

### 5. 📚 Built-in Viva & Theory Guide Center
- Textbook-level mathematical formulas for every algorithm.
- Frequently asked examiner viva questions with model answers.

### 6. 📑 1-Click Academic Laboratory Project Report
- Generates a formatted, printable laboratory experiment report summarizing dataset characteristics, preprocessing steps, algorithm parameters, and quantitative metrics ready for submission.

---

## 📂 Curated Academic Datasets Included
1. **Heart Disease Diagnostics** (Classification, 200 rows, 8 features: Age, Blood Pressure, Cholesterol, Chest Pain, Diagnosis)
2. **Iris Flowers** (Multiclass Classification, 150 rows, 4 features: Sepal/Petal lengths and widths)
3. **Mall Customer Segmentation** (Clustering, 200 rows: Age, Annual Income, Spending Score, Gender)
4. **Market Basket Transactions** (Association Rules, 150 transactions across 12 grocery items)
5. **Student Academic Performance** (Regression, 120 rows: Study Hours, Attendance, Assignments, Exam Marks)
6. **Real Estate House Pricing** (Regression, 150 properties: Square Footage, Bedrooms, Age, Garage, Price)
7. **IoT Industrial Sensors** (Outlier Detection, 160 readings with 8 injected machine anomalies)
8. **Custom CSV Upload:** Ingest any CSV table with instant header and column validation.

---

## ⚡ Quick Start Instructions

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Start the Backend API
```bash
cd backend
# Optional virtual environment:
# python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Backend will be live at: `http://localhost:8000`  
Swagger API Docs: `http://localhost:8000/docs`

### 2. Start the Frontend Workbench
```bash
cd frontend
npm install
npm run dev
```
Frontend will be live at: `http://localhost:5173`

---

## 🏗️ System Architecture

```
automine/
├── backend/
│   ├── main.py              # FastAPI server, ML models, EDA endpoints, inference
│   ├── requirements.txt     # Python dependencies
│   └── test_backend.py      # Automated backend endpoint & algorithm test suite
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main workbench UI, stepper, charts, What-If simulator
│   │   ├── styles.css       # Obsidian dark & light theme, glassmorphism design system
│   │   ├── api.js           # REST API client with error handling
│   │   └── techniques.js    # Algorithms, tags, hyperparameters & bounds
│   ├── index.html           # HTML entry point with Plus Jakarta Sans & JetBrains Mono
│   └── package.json         # React 18, Vite, Recharts, Lucide, Canvas-Confetti
└── README.md                # Project documentation & evaluation reference
```

---

## 🎓 Academic Viva Exam Tips
- **Gini Impurity vs Entropy:** Gini measures classification error probability ($1 - \sum p_i^2$, range $[0, 0.5]$); Entropy measures information disorder ($-\sum p_i \log_2 p_i$).
- **Apriori vs FP-Growth:** Apriori generates exponential candidate itemsets requiring multiple disk scans; FP-Growth uses a compact tree structure with zero candidate generation.
- **K-Means vs DBSCAN:** K-Means assumes spherical clusters and requires $K$ in advance; DBSCAN discovers arbitrary shapes using density ($\epsilon$, min samples) and isolates noise points.
- **Why F1-Score over Accuracy:** On imbalanced datasets, accuracy can be misleading because predicting only the majority class gives high accuracy while failing on the minority class.
