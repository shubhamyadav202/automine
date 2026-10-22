// AutoMiner Technique & Algorithm Definitions with Hyperparameters
export const TECH = {
  classification: {
    label: "Classification",
    kind: "Supervised Learning",
    blurb: "Predict categorical class labels from input features",
    icon: "Network",
    needsTarget: true,
    algos: {
      random_forest: {
        label: "Random Forest",
        tag: "Ensemble",
        desc: "Ensemble of randomized decision trees with bagging",
        params: [
          { k: "n_estimators", label: "Number of Trees", min: 10, max: 150, step: 10, def: 50 },
          { k: "max_depth", label: "Max Depth", min: 2, max: 12, step: 1, def: 5 },
        ],
      },
      decision_tree: {
        label: "Decision Tree",
        tag: "Interpretable",
        desc: "Recursive partitioning based on Gini or Information Gain",
        params: [
          { k: "max_depth", label: "Max Depth", min: 1, max: 12, step: 1, def: 4 },
          { k: "criterion", label: "Split Criterion", options: ["gini", "entropy"], def: "gini" },
          { k: "min_samples_split", label: "Min Samples to Split", min: 2, max: 10, step: 1, def: 2 },
        ],
      },
      logistic_regression: {
        label: "Logistic Regression",
        tag: "Linear",
        desc: "Linear decision boundary with sigmoid probability mapping",
        params: [
          { k: "C", label: "Inverse Regularization (C)", min: 0.1, max: 5.0, step: 0.1, def: 1.0 },
        ],
      },
      knn: {
        label: "K-Nearest Neighbours",
        tag: "Instance-Based",
        desc: "Majority voting among the closest K instances in feature space",
        params: [
          { k: "k", label: "Neighbours (k)", min: 1, max: 15, step: 1, def: 5 },
          { k: "metric", label: "Distance Metric", options: ["euclidean", "manhattan"], def: "euclidean" },
        ],
      },
      naive_bayes: {
        label: "Gaussian Naive Bayes",
        tag: "Probabilistic",
        desc: "Bayesian probability model with conditional independence assumption",
        params: [],
      },
      svm: {
        label: "Support Vector Machine",
        tag: "Max-Margin",
        desc: "Finds the optimal separating hyperplane with maximum margin",
        params: [
          { k: "kernel", label: "Kernel", options: ["rbf", "linear"], def: "rbf" },
          { k: "C", label: "Regularization (C)", min: 0.1, max: 5.0, step: 0.1, def: 1.0 },
        ],
      },
    },
  },

  regression: {
    label: "Regression",
    kind: "Supervised Learning",
    blurb: "Predict continuous numeric target values",
    icon: "TrendingUp",
    needsTarget: true,
    numericTarget: true,
    algos: {
      linear: {
        label: "Linear Regression (OLS)",
        tag: "Linear",
        desc: "Ordinary Least Squares minimizing sum of squared residuals",
        params: [],
      },
      ridge: {
        label: "Ridge Regression (L2)",
        tag: "Regularized",
        desc: "Linear regression with L2 weight shrinkage penalty",
        params: [
          { k: "alpha", label: "Penalty Weight (α)", min: 0.1, max: 10.0, step: 0.1, def: 1.0 },
        ],
      },
      lasso: {
        label: "Lasso Regression (L1)",
        tag: "Sparse",
        desc: "L1 regularization performing automatic feature selection",
        params: [
          { k: "alpha", label: "Sparsity Weight (α)", min: 0.01, max: 2.0, step: 0.05, def: 0.1 },
        ],
      },
      random_forest: {
        label: "Random Forest Regressor",
        tag: "Ensemble",
        desc: "Non-linear ensemble predicting mean target of forest trees",
        params: [
          { k: "n_estimators", label: "Number of Trees", min: 10, max: 150, step: 10, def: 50 },
          { k: "max_depth", label: "Max Depth", min: 2, max: 12, step: 1, def: 5 },
        ],
      },
      decision_tree: {
        label: "Decision Tree Regressor",
        tag: "Tree",
        desc: "Non-linear stepwise regression tree based on MSE reduction",
        params: [
          { k: "max_depth", label: "Max Depth", min: 1, max: 10, step: 1, def: 4 },
        ],
      },
    },
  },

  clustering: {
    label: "Clustering",
    kind: "Unsupervised Learning",
    blurb: "Discover natural groups and latent structures in unlabeled data",
    icon: "Boxes",
    algos: {
      kmeans: {
        label: "K-Means",
        tag: "Centroid-Based",
        desc: "Partition observations into K Voronoi cells around centroids",
        params: [
          { k: "k", label: "Number of Clusters (k)", min: 2, max: 10, step: 1, def: 3 },
        ],
      },
      hierarchical: {
        label: "Hierarchical Agglomerative",
        tag: "Connectivity",
        desc: "Bottom-up hierarchical clustering tree building",
        params: [
          { k: "k", label: "Number of Clusters (k)", min: 2, max: 10, step: 1, def: 3 },
          { k: "linkage", label: "Linkage Metric", options: ["ward", "complete", "average"], def: "ward" },
        ],
      },
      dbscan: {
        label: "DBSCAN",
        tag: "Density-Based",
        desc: "Density-based spatial clustering robust to arbitrary shapes and noise",
        params: [
          { k: "eps", label: "Neighborhood Radius (eps)", min: 0.1, max: 2.0, step: 0.1, def: 0.6 },
          { k: "min_samples", label: "Min Core Samples", min: 2, max: 12, step: 1, def: 5 },
        ],
      },
    },
  },

  association: {
    label: "Association Rules",
    kind: "Unsupervised Learning",
    blurb: "Extract frequent itemsets and co-occurrence rules from transactions",
    icon: "ShoppingCart",
    noFeatures: true,
    algos: {
      fpgrowth: {
        label: "FP-Growth",
        tag: "Frequent Pattern Tree",
        desc: "High-performance tree mining without candidate itemset generation",
        params: [
          { k: "min_support", label: "Minimum Support", min: 0.02, max: 0.5, step: 0.02, def: 0.1 },
          { k: "min_confidence", label: "Minimum Confidence", min: 0.1, max: 1.0, step: 0.05, def: 0.5 },
        ],
      },
      apriori: {
        label: "Apriori",
        tag: "Classic Level-wise",
        desc: "Breadth-first candidate generation using anti-monotonicity property",
        params: [
          { k: "min_support", label: "Minimum Support", min: 0.02, max: 0.5, step: 0.02, def: 0.1 },
          { k: "min_confidence", label: "Minimum Confidence", min: 0.1, max: 1.0, step: 0.05, def: 0.5 },
        ],
      },
    },
  },

  outlier: {
    label: "Outlier & Anomaly Detection",
    kind: "Unsupervised Learning",
    blurb: "Identify anomalous records, system faults, or rare deviations",
    icon: "ShieldAlert",
    algos: {
      isolation_forest: {
        label: "Isolation Forest",
        tag: "Ensemble Trees",
        desc: "Isolates anomalies by randomly partitioning feature dimensions",
        params: [
          { k: "contamination", label: "Contamination Rate", min: 0.01, max: 0.2, step: 0.01, def: 0.05 },
        ],
      },
      lof: {
        label: "Local Outlier Factor (LOF)",
        tag: "Local Density",
        desc: "Measures local deviation of density with respect to k-nearest neighbors",
        params: [
          { k: "n_neighbors", label: "Neighbor Window", min: 5, max: 30, step: 1, def: 20 },
          { k: "contamination", label: "Contamination Rate", min: 0.01, max: 0.2, step: 0.01, def: 0.05 },
        ],
      },
      zscore: {
        label: "Z-Score Statistical",
        tag: "Parametric",
        desc: "Identifies points exceeding standard deviation distance threshold",
        params: [
          { k: "threshold", label: "Sigma Threshold (|z|)", min: 1.5, max: 4.0, step: 0.25, def: 3.0 },
        ],
      },
    },
  },
};
