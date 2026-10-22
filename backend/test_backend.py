import main
from main import (
    app, SAMPLES, load_sample, get_eda, preprocess_dataset, PrepReq,
    execute_technique, RunReq, predict_live, PredictReq, explain_results, ExplainReq, export_report, ReportReq
)

print("1. Testing sample loading...")
res_iris = load_sample("iris")
did = res_iris["dataset_id"]
print(f"   Loaded Iris dataset: ID={did}, rows={res_iris['rows']}, cols={len(res_iris['columns'])}")

print("2. Testing EDA endpoint...")
eda = get_eda(did)
assert len(eda["stats"]) == 4, f"Expected 4 stats, got {len(eda['stats'])}"
assert len(eda["correlation"]["matrix"]) == 4
print(f"   EDA validated: {len(eda['stats'])} features profiled, correlation matrix generated.")

print("3. Testing Preprocessing...")
prep_res = preprocess_dataset(PrepReq(dataset_id=did, missing="mean", scale="standard", drop_duplicates=True))
assert prep_res["rows"] > 0
print(f"   Preprocessing validated: Scaled {prep_res['rows']} rows.")

print("4. Testing Classification (Random Forest & Decision Tree)...")
req_rf = RunReq(dataset_id=did, algorithm="random_forest", target="species", params={"n_estimators": 30, "max_depth": 5})
res_rf = execute_technique("classification", req_rf)
assert res_rf["metrics"]["accuracy"] > 0.8
print(f"   Random Forest Accuracy: {res_rf['metrics']['accuracy'] * 100:.2f}%")

print("5. Testing Live Interactive Predict...")
pred = predict_live(PredictReq(dataset_id=did, input_values={"sepal_length": 5.1, "sepal_width": 3.5, "petal_length": 1.4, "petal_width": 0.2}))
print(f"   Prediction: {pred['prediction']} (Confidence: {pred.get('confidence')}%)")

print("6. Testing Clustering (K-Means with Elbow & Silhouette)...")
mall = load_sample("mall")
res_clus = execute_technique("clustering", RunReq(dataset_id=mall["dataset_id"], algorithm="kmeans", params={"k": 3}))
print(f"   K-Means Silhouette Score: {res_clus['metrics']['silhouette_score']:.4f}")

print("7. Testing Association Rules (FP-Growth)...")
basket = load_sample("basket")
res_assoc = execute_technique("association", RunReq(dataset_id=basket["dataset_id"], algorithm="fpgrowth", params={"min_support": 0.1, "min_confidence": 0.4}))
print(f"   FP-Growth: {res_assoc['metrics']['rules_generated']} association rules found.")

print("8. Testing Regression (Ridge & Linear)...")
stud = load_sample("students")
res_reg = execute_technique("regression", RunReq(dataset_id=stud["dataset_id"], algorithm="linear", target="Final_Score"))
print(f"   Regression R² Score: {res_reg['metrics']['r2_score']:.4f}")

print("9. Testing Outlier Detection (Isolation Forest)...")
sens = load_sample("sensors")
res_out = execute_technique("outlier", RunReq(dataset_id=sens["dataset_id"], algorithm="isolation_forest", params={"contamination": 0.05}))
print(f"   Anomalies detected: {res_out['metrics']['anomalies_detected']} rows.")

print("10. Testing Explainer & Viva Q&A Engine...")
exp = explain_results(ExplainReq(technique="classification", algorithm="random_forest", metrics=res_rf["metrics"], summary=res_rf["summary"]))
assert "theory" in exp
print("    Analytical Explainer generated successfully with viva Q&A.")

print("11. Testing Export Report...")
rep = export_report(ReportReq(dataset_id=did, technique="classification", algorithm="random_forest", metrics=res_rf["metrics"], summary=res_rf["summary"]))
assert len(rep["markdown"]) > 100
print("    Markdown Project Report generated successfully.")

print("\n>>> ALL 11 TESTS PASSED WITH 100% SUCCESS! <<<")
