import React, { useEffect, useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell
} from "recharts";
import confetti from "canvas-confetti";
import {
  Sparkles,
  Database,
  Filter,
  Cpu,
  BarChart3,
  Brain,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Network,
  Boxes,
  ShoppingCart,
  ShieldAlert,
  Sun,
  Moon,
  FileText,
  Play,
  RefreshCw,
  Sliders,
  Download,
  Search,
  Table as TableIcon,
  Flame,
  Activity,
  ArrowRight,
  ChevronRight,
  Info,
  Check,
  X,
  Upload,
  BookOpen,
  Printer
} from "lucide-react";

import { api } from "./api";
import { TECH } from "./techniques";

// Theme & Navigation Constants
const STEPS = [
  { id: 0, label: "Explore & Ingest", icon: Database },
  { id: 1, label: "Clean & Prepare", icon: Filter },
  { id: 2, label: "Algorithm Studio", icon: Cpu },
  { id: 3, label: "Results & Inference", icon: BarChart3 }
];

const PALETTE = ["#06b6d4", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#3b82f6", "#ec4899", "#14b8a6"];
const CHART_MARGIN = { top: 12, right: 16, bottom: 8, left: 4 };

// Format helpers
const fmt = (v) => {
  if (v === null || v === undefined) return "–";
  if (typeof v === "number") {
    if (Number.isInteger(v)) return v.toLocaleString();
    return v.toFixed(3);
  }
  return String(v);
};

const tickFmt = (v) => (typeof v === "number" ? +v.toFixed(2) : v);

// Custom Glass Tooltip for Charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        {label !== undefined && <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>}
        {payload.map((entry, index) => (
          <div key={index} style={{ color: entry.color || "var(--primary)" }}>
            {entry.name}: <b>{fmt(entry.value)}</b>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// ==============================================================================
// Sub-components
// ==============================================================================

function DataTable({ rows, cols, maxRows = 8 }) {
  if (!rows || !rows.length) return <p style={{ color: "var(--text-muted)" }}>No records to display.</p>;
  const keys = cols || Object.keys(rows[0]);
  const displayRows = rows.slice(0, maxRows);

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {keys.map((k) => (
              <th key={k}>{k.replace(/_/g, " ")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((r, i) => (
            <tr key={i}>
              {keys.map((k) => (
                <td key={k}>{fmt(r[k])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Correlation Heatmap Matrix
function CorrelationHeatmap({ correlation }) {
  if (!correlation || !correlation.columns || !correlation.columns.length) {
    return <p style={{ color: "var(--text-muted)" }}>At least 2 numeric columns are required to generate a correlation matrix.</p>;
  }

  const { columns, matrix } = correlation;

  const getColor = (val) => {
    if (val === null || val === undefined) return "var(--bg-subtle)";
    if (val === 1) return "rgba(6, 182, 212, 0.85)";
    if (val > 0) return `rgba(6, 182, 212, ${Math.max(0.15, val * 0.8)})`;
    if (val < 0) return `rgba(244, 63, 94, ${Math.max(0.15, Math.abs(val) * 0.8)})`;
    return "rgba(148, 163, 184, 0.1)";
  };

  return (
    <div className="heatmap-container">
      <table className="heatmap-table">
        <thead>
          <tr>
            <th></th>
            {columns.map((col) => (
              <th key={col} title={col}>
                {col.length > 10 ? col.substring(0, 9) + "…" : col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={columns[i]}>
              <th title={columns[i]}>{columns[i].length > 10 ? columns[i].substring(0, 9) + "…" : columns[i]}</th>
              {row.map((val, j) => (
                <td
                  key={j}
                  style={{ background: getColor(val), color: Math.abs(val) > 0.4 ? "#fff" : "var(--text-main)" }}
                  title={`${columns[i]} ↔ ${columns[j]}: ${val}`}
                >
                  {val.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Confusion Matrix Component
function ConfusionMatrix({ cm }) {
  if (!cm || !cm.matrix) return null;
  const { labels, matrix } = cm;
  const maxVal = Math.max(1, ...matrix.flat());

  return (
    <div className="table-scroll" style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
      <table className="cm-table">
        <thead>
          <tr>
            <th style={{ color: "var(--primary)" }}>Actual ↓ / Pred →</th>
            {labels.map((l) => (
              <th key={l}>{l}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={i}>
              <th>{labels[i]}</th>
              {row.map((val, j) => {
                const isDiagonal = i === j;
                const intensity = (val / maxVal).toFixed(2);
                const bg = isDiagonal
                  ? `rgba(16, 185, 129, ${Math.max(0.25, intensity)})`
                  : val > 0
                  ? `rgba(244, 63, 94, ${Math.max(0.2, intensity)})`
                  : "rgba(148, 163, 184, 0.08)";
                return (
                  <td key={j} style={{ background: bg }} title={`Actual: ${labels[i]}, Predicted: ${labels[j]} (${val} cases)`}>
                    {val}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==============================================================================
// Main Application Component
// ==============================================================================
export default function App() {
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState(() => localStorage.getItem("automine_theme") || "dark");
  const [serverOnline, setServerOnline] = useState(false);

  // Data & EDA states
  const [samples, setSamples] = useState([]);
  const [ds, setDs] = useState(null);
  const [edaData, setEdaData] = useState(null);
  const [edaTab, setEdaTab] = useState("overview");
  const [selectedHistCol, setSelectedHistCol] = useState("");
  const [previewSearch, setPreviewSearch] = useState("");

  // Preprocessing options
  const [prep, setPrep] = useState({
    missing: "mean",
    outliers: "none",
    scale: "none",
    drop_duplicates: false
  });
  const [prepReport, setPrepReport] = useState(null);

  // Mining parameters
  const [tech, setTech] = useState("classification");
  const [algo, setAlgo] = useState("random_forest");
  const [params, setParams] = useState({});
  const [target, setTarget] = useState("");
  const [offFeatures, setOffFeatures] = useState([]);
  const [testSplit, setTestSplit] = useState(0.25);

  // Results & Live Inference
  const [result, setResult] = useState(null);
  const [ai, setAi] = useState(null);
  const [ruleSearch, setRuleSearch] = useState("");
  const [whatIfValues, setWhatIfValues] = useState({});
  const [whatIfPrediction, setWhatIfPrediction] = useState(null);

  // Academic Report Modal & Viva Drawer
  const [reportModal, setReportModal] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState("");
  const [vivaOpen, setVivaOpen] = useState(false);

  // Status & Feedback
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  // Sync theme attribute
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("automine_theme", theme);
  }, [theme]);

  // Ping backend health & load sample catalog
  useEffect(() => {
    api.health()
      .then((h) => {
        setServerOnline(true);
        return api.samples();
      })
      .then((s) => setSamples(s || []))
      .catch(() => {
        setServerOnline(false);
        setErr("Could not connect to AutoMiner backend. Ensure the backend server is running on http://localhost:8000.");
      });
  }, []);

  // Update default algorithm parameters whenever technique or algorithm changes
  useEffect(() => {
    const currentAlgoDef = TECH[tech]?.algos[algo];
    if (currentAlgoDef?.params) {
      const defaults = Object.fromEntries(currentAlgoDef.params.map((p) => [p.k, p.def]));
      setParams(defaults);
    }
  }, [tech, algo]);

  // Helper guard for async operations
  const guard = async (label, fn) => {
    setBusy(label);
    setErr("");
    try {
      await fn();
    } catch (e) {
      setErr(e.message || "An unexpected error occurred.");
    } finally {
      setBusy("");
    }
  };

  // Adopt new dataset
  const adoptDataset = async (datasetInfo, suggest = null) => {
    setDs(datasetInfo);
    setResult(null);
    setAi(null);
    setOffFeatures([]);
    setWhatIfPrediction(null);
    setPrepReport(null);

    // Fetch EDA
    try {
      const eda = await api.eda(datasetInfo.dataset_id);
      setEdaData(eda);
      if (eda.numeric_features && eda.numeric_features.length) {
        setSelectedHistCol(eda.numeric_features[0]);
      }
    } catch (e) {
      console.warn("EDA fetch error:", e);
    }

    // Apply suggestions if present
    if (suggest) {
      setTech(suggest.technique);
      setAlgo(suggest.algorithm || Object.keys(TECH[suggest.technique].algos)[0]);
      setTarget(suggest.target || "");
    } else {
      setTarget("");
    }
  };

  const loadSample = (key) =>
    guard("load", async () => {
      const d = await api.loadSample(key);
      await adoptDataset(d, d.suggest);
    });

  const uploadFile = (file) =>
    file &&
    guard("load", async () => {
      const d = await api.upload(file);
      await adoptDataset(d);
    });

  const applyPreprocessing = () =>
    guard("prep", async () => {
      const res = await api.preprocess({
        dataset_id: ds.dataset_id,
        ...prep
      });
      setDs(res);
      setPrepReport(res);
      // Refresh EDA after preprocessing
      const newEda = await api.eda(ds.dataset_id);
      setEdaData(newEda);
    });

  const currentTechDef = TECH[tech];
  const allColumns = ds ? ds.columns : [];
  const usableFeatures = allColumns
    .map((c) => c.name)
    .filter((n) => n !== target && !offFeatures.includes(n));
  const targetCandidates = allColumns.filter(
    (c) => !currentTechDef.numericTarget || c.dtype === "number"
  );

  const runMining = () =>
    guard("run", async () => {
      if (currentTechDef.needsTarget && !target) {
        throw new Error("Please specify a Target Column for supervised learning.");
      }
      const r = await api.run(tech, {
        dataset_id: ds.dataset_id,
        algorithm: algo,
        target: currentTechDef.needsTarget ? target : null,
        features: currentTechDef.noFeatures ? null : usableFeatures,
        params,
        test_size: testSplit
      });
      setResult(r);
      setAi(null);
      setWhatIfPrediction(null);
      setStep(3);

      // Trigger celebratory confetti burst on successful run
      try {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.65 }
        });
      } catch (e) {}
    });

  const generateExplanation = () =>
    guard("explain", async () => {
      const res = await api.explain({
        technique: tech,
        algorithm: algo,
        metrics: result.metrics,
        summary: result.summary
      });
      setAi(res);
    });

  const executeWhatIfPrediction = () =>
    guard("predict", async () => {
      const res = await api.predict({
        dataset_id: ds.dataset_id,
        input_values: whatIfValues
      });
      setWhatIfPrediction(res);
    });

  const exportProjectReport = () =>
    guard("report", async () => {
      const res = await api.exportReport({
        dataset_id: ds.dataset_id,
        technique: tech,
        algorithm: algo,
        metrics: result.metrics,
        summary: result.summary
      });
      setReportMarkdown(res.markdown);
      setReportModal(true);
    });

  const canNavigateTo = (targetStep) => {
    if (targetStep === 0) return true;
    if (targetStep <= 2) return Boolean(ds);
    if (targetStep === 3) return Boolean(result);
    return false;
  };

  // Filter preview records based on user search
  const filteredPreview = useMemo(() => {
    if (!ds || !ds.preview) return [];
    if (!previewSearch.trim()) return ds.preview;
    const query = previewSearch.toLowerCase();
    return ds.preview.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(query))
    );
  }, [ds, previewSearch]);

  return (
    <div className="app-container">
      {/* ==============================================================================
          Sidebar Navigation Rail
          ============================================================================== */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Sparkles size={22} />
          </div>
          <div>
            <div className="brand-title">AutoMiner Pro</div>
            <div className="brand-sub">Workbench v2.0</div>
          </div>
        </div>

        {/* Active Dataset Chip */}
        {ds && (
          <div className="active-ds-chip">
            <div className="chip-label">
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)" }}>ACTIVE DATASET</span>
              <Database size={13} color="var(--primary)" />
            </div>
            <div className="chip-name" title={ds.name}>
              {ds.name}
            </div>
            <div className="chip-meta">
              {ds.rows.toLocaleString()} rows • {ds.total_columns || ds.columns.length} attributes
            </div>
          </div>
        )}

        {/* 4-Step Stepper */}
        <nav className="nav-steps">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isCurrent = step === s.id;
            const isDone = step > s.id;
            const isAccessible = canNavigateTo(s.id);

            return (
              <button
                key={s.id}
                disabled={!isAccessible}
                className={`step-btn ${isCurrent ? "active" : ""} ${isDone ? "completed" : ""}`}
                onClick={() => setStep(s.id)}
              >
                <div className="step-num">{isDone ? <Check size={14} /> : s.id + 1}</div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>{s.label}</span>
                  <Icon size={15} style={{ opacity: isCurrent ? 1 : 0.5 }} />
                </div>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="sidebar-footer">
          <div className="server-status">
            <div className={`status-dot ${serverOnline ? "" : "offline"}`} />
            <span>{serverOnline ? "Engine Connected" : "Server Offline (Port 8000)"}</span>
          </div>

          <button
            className="theme-toggle-btn"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle Visual Theme"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>
      </aside>

      {/* ==============================================================================
          Main Workspace Content
          ============================================================================== */}
      <main className="main-content">
        {/* Error notification banner */}
        {err && (
          <div className="error-banner" role="alert">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertTriangle size={18} />
              <span>{err}</span>
            </div>
            <button onClick={() => setErr("")}>✕</button>
          </div>
        )}

        {/* ============================================================================
            STEP 0: Data Selection & Exploratory Data Analysis (EDA) Hub
            ============================================================================ */}
        {step === 0 && (
          <div>
            <div className="step-header">
              <div className="step-tag">
                <Database size={14} /> Step 01 • Data Ingestion & EDA
              </div>
              <h1 className="step-title">Choose Your Data Source</h1>
              <p className="step-subtitle">
                Select from our curated academic benchmark datasets or upload custom CSV data.
              </p>
            </div>

            {/* Datasets Catalog Grid */}
            <div className="dataset-grid">
              {samples.map((s) => (
                <button
                  key={s.key}
                  className={`dataset-card ${ds?.name === s.label ? "selected" : ""}`}
                  disabled={!!busy}
                  onClick={() => loadSample(s.key)}
                >
                  <div className="dataset-card-top">
                    <span className="dataset-badge">{s.badge || s.category}</span>
                    {ds?.name === s.label && <CheckCircle2 size={16} color="var(--primary)" />}
                  </div>
                  <div className="dataset-card-name">{s.label}</div>
                  <div className="dataset-card-desc">{s.desc}</div>
                </button>
              ))}

              {/* Upload CSV Card */}
              <label className="dataset-card upload-card">
                <Upload size={24} color="var(--primary)" style={{ marginBottom: 6 }} />
                <div className="dataset-card-name">Upload Custom CSV</div>
                <div className="dataset-card-desc">Drag & drop or browse any tabular CSV file</div>
                <input
                  type="file"
                  accept=".csv"
                  disabled={!!busy}
                  onChange={(e) => uploadFile(e.target.files[0])}
                />
              </label>
            </div>

            {/* Comprehensive EDA Hub */}
            {ds && (
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">
                      <BarChart3 size={18} color="var(--primary)" />
                      Exploratory Data Analysis (EDA) Intelligence Hub
                    </h2>
                    <p className="panel-subtitle">
                      Statistical profiles, correlation matrix, and frequency distributions for {ds.name}
                    </p>
                  </div>
                </div>

                {/* Top Summary Metrics */}
                <div className="stats-grid">
                  <div className="stat-box">
                    <span className="stat-val">{ds.rows.toLocaleString()}</span>
                    <span className="stat-label">Total Observations</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-val">{ds.total_columns || ds.columns.length}</span>
                    <span className="stat-label">Feature Dimensions</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-val" style={{ color: ds.total_nulls > 0 ? "var(--accent-amber)" : "var(--accent-emerald)" }}>
                      {ds.total_nulls || 0}
                    </span>
                    <span className="stat-label">Missing Values</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-val" style={{ color: ds.duplicates > 0 ? "var(--accent-rose)" : "var(--accent-emerald)" }}>
                      {ds.duplicates || 0}
                    </span>
                    <span className="stat-label">Duplicate Rows</span>
                  </div>
                </div>

                {/* Sub-tab Navigation */}
                <div className="eda-tabs">
                  <button
                    className={`eda-tab-btn ${edaTab === "overview" ? "active" : ""}`}
                    onClick={() => setEdaTab("overview")}
                  >
                    <TableIcon size={14} /> Column Profiling Table
                  </button>
                  <button
                    className={`eda-tab-btn ${edaTab === "correlation" ? "active" : ""}`}
                    onClick={() => setEdaTab("correlation")}
                  >
                    <Flame size={14} /> Correlation Heatmap
                  </button>
                  <button
                    className={`eda-tab-btn ${edaTab === "distribution" ? "active" : ""}`}
                    onClick={() => setEdaTab("distribution")}
                  >
                    <BarChart3 size={14} /> Feature Distributions
                  </button>
                  <button
                    className={`eda-tab-btn ${edaTab === "preview" ? "active" : ""}`}
                    onClick={() => setEdaTab("preview")}
                  >
                    <Search size={14} /> Raw Data Browser
                  </button>
                </div>

                {/* Tab A: Column Profiling */}
                {edaTab === "overview" && (
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Attribute</th>
                          <th>Data Type</th>
                          <th>Missing Values</th>
                          <th>Unique Count</th>
                          <th>Min</th>
                          <th>Mean</th>
                          <th>Std Dev</th>
                          <th>Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ds.columns.map((c) => (
                          <tr key={c.name}>
                            <td style={{ fontWeight: 600 }}>{c.name}</td>
                            <td>
                              <span className={`badge ${c.dtype === "number" ? "badge-num" : "badge-text"}`}>
                                {c.dtype}
                              </span>
                            </td>
                            <td>
                              <span style={{ color: c.nulls > 0 ? "var(--accent-amber)" : "var(--text-muted)" }}>
                                {c.nulls} ({c.null_pct || 0}%)
                              </span>
                            </td>
                            <td>{c.unique}</td>
                            <td>{fmt(c.min)}</td>
                            <td>{fmt(c.mean)}</td>
                            <td>{fmt(c.std)}</td>
                            <td>{fmt(c.max)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab B: Correlation Matrix Heatmap */}
                {edaTab === "correlation" && edaData && (
                  <div>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: 12 }}>
                      Pairwise Pearson correlation coefficients between numeric variables. Cyan indicates positive correlation; Rose indicates negative correlation.
                    </p>
                    <CorrelationHeatmap correlation={edaData.correlation} />
                  </div>
                )}

                {/* Tab C: Feature Distributions */}
                {edaTab === "distribution" && edaData && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <label style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--text-muted)" }}>
                        Select Feature:
                      </label>
                      <select
                        className="input-select"
                        style={{ maxWidth: 260 }}
                        value={selectedHistCol}
                        onChange={(e) => setSelectedHistCol(e.target.value)}
                      >
                        {(edaData.numeric_features || []).map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedHistCol && edaData.histograms?.[selectedHistCol] ? (
                      <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={edaData.histograms[selectedHistCol]} margin={CHART_MARGIN}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="range" stroke="var(--text-dim)" fontSize={12} />
                            <YAxis stroke="var(--text-dim)" fontSize={12} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p style={{ color: "var(--text-muted)" }}>Select a numeric column above to view its frequency distribution.</p>
                    )}
                  </div>
                )}

                {/* Tab D: Raw Data Browser */}
                {edaTab === "preview" && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <Search size={16} color="var(--text-dim)" />
                      <input
                        type="text"
                        placeholder="Search records in preview..."
                        className="input-text"
                        style={{ maxWidth: 300 }}
                        value={previewSearch}
                        onChange={(e) => setPreviewSearch(e.target.value)}
                      />
                    </div>
                    <DataTable rows={filteredPreview} />
                  </div>
                )}

                <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-primary btn-lg" onClick={() => setStep(1)}>
                    Proceed to Data Cleaning <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================================
            STEP 1: Data Preparation & Preprocessing Studio
            ============================================================================ */}
        {step === 1 && ds && (
          <div>
            <div className="step-header">
              <div className="step-tag">
                <Filter size={14} /> Step 02 • Data Preprocessing Pipeline
              </div>
              <h1 className="step-title">Cleanse & Transform Attributes</h1>
              <p className="step-subtitle">
                Handle missing values, filter anomalous outliers, remove duplicates, and apply feature scaling.
              </p>
            </div>

            <div className="panel">
              <h2 className="panel-title" style={{ marginBottom: 16 }}>
                <Sliders size={18} color="var(--primary)" /> Preprocessing Configuration
              </h2>

              <div className="form-grid">
                {/* Missing values strategy */}
                <div className="form-group">
                  <label>Missing Value Imputation</label>
                  <select
                    className="input-select"
                    value={prep.missing}
                    onChange={(e) => setPrep({ ...prep, missing: e.target.value })}
                  >
                    <option value="mean">Mean (Continuous) / Mode (Text)</option>
                    <option value="median">Median (Robust to Outliers)</option>
                    <option value="mode">Mode (Most Frequent Value)</option>
                    <option value="zero">Constant Fill (0 / 'Unknown')</option>
                    <option value="drop">Drop Incomplete Rows</option>
                    <option value="none">Retain As-Is</option>
                  </select>
                </div>

                {/* Outlier strategy */}
                <div className="form-group">
                  <label>Outlier Filtering Strategy</label>
                  <select
                    className="input-select"
                    value={prep.outliers}
                    onChange={(e) => setPrep({ ...prep, outliers: e.target.value })}
                  >
                    <option value="none">No Outlier Filtering</option>
                    <option value="iqr">IQR Filter (1.5 × Interquartile Range)</option>
                    <option value="zscore">Z-Score Filter (|z| &lt; 3.0 Standard Deviations)</option>
                  </select>
                </div>

                {/* Feature scaling */}
                <div className="form-group">
                  <label>Feature Scaling & Normalization</label>
                  <select
                    className="input-select"
                    value={prep.scale}
                    onChange={(e) => setPrep({ ...prep, scale: e.target.value })}
                  >
                    <option value="none">None (Raw Scales)</option>
                    <option value="standard">StandardScaler (z = (x - μ) / σ)</option>
                    <option value="minmax">MinMaxScaler [0, 1] (Recommended for KNN/K-Means)</option>
                    <option value="robust">RobustScaler (Median & IQR Based)</option>
                  </select>
                </div>
              </div>

              {/* Duplicate removal toggle */}
              <div style={{ marginTop: 12, marginBottom: 20 }}>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={prep.drop_duplicates}
                    onChange={(e) => setPrep({ ...prep, drop_duplicates: e.target.checked })}
                  />
                  <span>Remove exact duplicate rows across all attributes</span>
                </label>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="btn btn-secondary"
                  disabled={busy === "prep"}
                  onClick={applyPreprocessing}
                >
                  <RefreshCw size={15} className={busy === "prep" ? "animate-spin" : ""} />
                  {busy === "prep" ? "Applying Transformations..." : "Apply Pipeline to Dataset"}
                </button>
              </div>

              {/* Transformation Confirmation */}
              {prepReport && (
                <div
                  style={{
                    marginTop: 18,
                    padding: 14,
                    borderRadius: "var(--radius-md)",
                    background: "rgba(16, 185, 129, 0.1)",
                    border: "1px solid rgba(16, 185, 129, 0.3)"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent-emerald)", fontWeight: 700, marginBottom: 6 }}>
                    <CheckCircle2 size={16} /> Pipeline Successfully Applied!
                  </div>
                  <ul style={{ paddingLeft: 20, fontSize: "13px", color: "var(--text-main)" }}>
                    {prepReport.actions_applied?.map((act, i) => (
                      <li key={i}>{act}</li>
                    ))}
                    <li>Clean dataset ready: {prepReport.cleaned_rows} rows retained.</li>
                  </ul>
                </div>
              )}
            </div>

            {/* Current Processed Preview Table */}
            <div className="panel">
              <h2 className="panel-title" style={{ marginBottom: 14 }}>
                <TableIcon size={18} color="var(--primary)" /> Preprocessed Data Sample
              </h2>
              <DataTable rows={ds.preview} />
              <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
                <button className="btn btn-secondary" onClick={() => setStep(0)}>
                  ← Back to Ingestion
                </button>
                <button className="btn btn-primary btn-lg" onClick={() => setStep(2)}>
                  Continue to Mining Lab <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================
            STEP 2: Mining Technique & Algorithm Configuration Lab
            ============================================================================ */}
        {step === 2 && ds && (
          <div>
            <div className="step-header">
              <div className="step-tag">
                <Cpu size={14} /> Step 03 • Algorithm Studio & Hyperparameters
              </div>
              <h1 className="step-title">Select Mining Technique</h1>
              <p className="step-subtitle">
                Configure your target variable, features, and model hyperparameters.
              </p>
            </div>

            {/* Technique Cards */}
            <div className="dataset-grid" style={{ marginBottom: 20 }}>
              {Object.entries(TECH).map(([k, t]) => {
                const isSel = k === tech;
                return (
                  <button
                    key={k}
                    className={`dataset-card ${isSel ? "selected" : ""}`}
                    onClick={() => {
                      setTech(k);
                      setAlgo(Object.keys(t.algos)[0]);
                      setResult(null);
                    }}
                  >
                    <div className="dataset-card-top">
                      <span className="dataset-badge">{t.kind}</span>
                      {isSel && <CheckCircle2 size={16} color="var(--primary)" />}
                    </div>
                    <div className="dataset-card-name">{t.label}</div>
                    <div className="dataset-card-desc">{t.blurb}</div>
                  </button>
                );
              })}
            </div>

            {/* Algorithm Settings Panel */}
            <div className="panel">
              <h2 className="panel-title" style={{ marginBottom: 18 }}>
                <Sliders size={18} color="var(--primary)" /> Algorithm Architecture & Hyperparameters
              </h2>

              <div className="form-grid">
                {/* Algorithm Choice */}
                <div className="form-group">
                  <label>Algorithm</label>
                  <select
                    className="input-select"
                    value={algo}
                    onChange={(e) => setAlgo(e.target.value)}
                  >
                    {Object.entries(currentTechDef.algos).map(([k, a]) => (
                      <option key={k} value={k}>
                        {a.label} ({a.tag})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Column Selection (if supervised) */}
                {currentTechDef.needsTarget && (
                  <div className="form-group">
                    <label>Target Variable (to predict)</label>
                    <select
                      className="input-select"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                    >
                      <option value="">Select Target Column...</option>
                      {targetCandidates.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.dtype})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Train / Test Split Slider (if supervised) */}
                {currentTechDef.needsTarget && (
                  <div className="slider-group">
                    <div className="slider-header">
                      <span>Hold-Out Test Split Ratio</span>
                      <span className="slider-value">{(testSplit * 100).toFixed(0)}% Test / {(100 - testSplit * 100).toFixed(0)}% Train</span>
                    </div>
                    <input
                      type="range"
                      min={0.15}
                      max={0.35}
                      step={0.05}
                      value={testSplit}
                      onChange={(e) => setTestSplit(Number(e.target.value))}
                    />
                  </div>
                )}
              </div>

              {/* Dynamic Algorithm Hyperparameters */}
              {currentTechDef.algos[algo]?.params?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <h3 style={{ fontSize: "14px", fontWeight: 700, marginBottom: 12, color: "var(--text-muted)" }}>
                    Tune Hyperparameters
                  </h3>
                  <div className="form-grid">
                    {currentTechDef.algos[algo].params.map((p) =>
                      p.options ? (
                        <div key={p.k} className="form-group">
                          <label>{p.label}</label>
                          <select
                            className="input-select"
                            value={params[p.k] ?? p.def}
                            onChange={(e) => setParams({ ...params, [p.k]: e.target.value })}
                          >
                            {p.options.map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div key={p.k} className="slider-group">
                          <div className="slider-header">
                            <span>{p.label}</span>
                            <span className="slider-value">{params[p.k] ?? p.def}</span>
                          </div>
                          <input
                            type="range"
                            min={p.min}
                            max={p.max}
                            step={p.step}
                            value={params[p.k] ?? p.def}
                            onChange={(e) => setParams({ ...params, [p.k]: Number(e.target.value) })}
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Feature Selection Chips */}
              {!currentTechDef.noFeatures && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)" }}>
                      Features to Include in Model ({usableFeatures.length} active)
                    </label>
                    <div style={{ display: "flex", gap: 10 }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "11px" }}
                        onClick={() => setOffFeatures([])}
                      >
                        Select All
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "4px 10px", fontSize: "11px" }}
                        onClick={() =>
                          setOffFeatures(allColumns.map((c) => c.name).filter((n) => n !== target))
                        }
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="feature-chips">
                    {allColumns
                      .filter((c) => c.name !== target)
                      .map((c) => {
                        const isOff = offFeatures.includes(c.name);
                        return (
                          <button
                            key={c.name}
                            className={`chip-tag ${isOff ? "excluded" : ""}`}
                            onClick={() =>
                              setOffFeatures(
                                isOff ? offFeatures.filter((n) => n !== c.name) : [...offFeatures, c.name]
                              )
                            }
                          >
                            {!isOff ? <Check size={12} color="var(--primary)" /> : <X size={12} />}
                            {c.name}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}>
                  ← Back to Cleaning
                </button>
                <button
                  className="btn btn-primary btn-lg"
                  disabled={busy === "run"}
                  onClick={runMining}
                >
                  <Play size={16} fill="currentColor" />
                  {busy === "run"
                    ? "Running Mining Algorithm..."
                    : `Execute ${currentTechDef.algos[algo]?.label || "Model"}`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================================
            STEP 3: Results, Visual Analytics & Inference Playground
            ============================================================================ */}
        {step === 3 && result && (
          <div>
            <div className="step-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="step-tag">
                  <BarChart3 size={14} /> Step 04 • Experimental Results
                </div>
                <h1 className="step-title">
                  {TECH[result.technique].label}: {TECH[result.technique].algos[result.algorithm]?.label}
                </h1>
                <p className="step-subtitle">
                  Trained on {result.dataset_name} with automated validation metrics and visual diagnostics.
                </p>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setVivaOpen(!vivaOpen)}>
                  <BookOpen size={16} /> Viva & Theory Guide
                </button>
                <button className="btn btn-primary" onClick={exportProjectReport}>
                  <FileText size={16} /> Export Project Report
                </button>
              </div>
            </div>

            {/* KPI Metrics Scorecard */}
            <div className="kpi-grid">
              {Object.entries(result.metrics).map(([k, v]) => (
                <div key={k} className="kpi-card">
                  <span className="kpi-val">
                    {typeof v === "number" && (k.includes("acc") || k.includes("f1") || k.includes("prec") || k.includes("rec") || k.includes("score") || k.includes("pct"))
                      ? v <= 1.0 && !k.includes("db")
                        ? `${(v * 100).toFixed(1)}%`
                        : v.toFixed(3)
                      : fmt(v)}
                  </span>
                  <span className="kpi-name">{k.replace(/_/g, " ")}</span>
                </div>
              ))}
            </div>

            {/* Visual Analytics Per Technique */}
            {result.technique === "classification" && (
              <>
                <div className="panel">
                  <h2 className="panel-title">
                    <Boxes size={18} color="var(--primary)" /> Confusion Matrix (Actual vs Predicted)
                  </h2>
                  <ConfusionMatrix cm={result.charts.confusion} />
                </div>

                {result.charts.importance?.length > 0 && (
                  <div className="panel">
                    <h2 className="panel-title">
                      <BarChart3 size={18} color="var(--primary)" /> Feature Importance Ranking
                    </h2>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={result.charts.importance.slice(0, 10)}
                          layout="vertical"
                          margin={{ top: 8, right: 24, bottom: 8, left: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis type="number" stroke="var(--text-dim)" fontSize={12} tickFormatter={tickFmt} />
                          <YAxis type="category" dataKey="feature" stroke="var(--text-dim)" fontSize={12} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {result.text && (
                  <div className="panel">
                    <h2 className="panel-title">
                      <FileText size={18} color="var(--primary)" /> Learned Decision Rules (Text Representation)
                    </h2>
                    <pre style={{ maxHeight: 280, overflowY: "auto", background: "var(--bg-subtle)", padding: 14, borderRadius: "var(--radius-md)" }}>
                      {result.text}
                    </pre>
                  </div>
                )}
              </>
            )}

            {result.technique === "regression" && (
              <>
                <div className="panel">
                  <h2 className="panel-title">
                    <TrendingUp size={18} color="var(--primary)" /> Actual vs Predicted Values
                  </h2>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={CHART_MARGIN}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" dataKey="x" name="Actual" stroke="var(--text-dim)" tickFormatter={tickFmt} />
                        <YAxis type="number" dataKey="y" name="Predicted" stroke="var(--text-dim)" tickFormatter={tickFmt} />
                        <Tooltip content={<CustomTooltip />} />
                        <Scatter name="Test Instances" data={result.charts.actual_vs_pred} fill="var(--primary)" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="panel">
                  <h2 className="panel-title">
                    <Activity size={18} color="var(--primary)" /> Residual Error Analysis (Predicted vs Residual)
                  </h2>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={CHART_MARGIN}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" dataKey="x" name="Predicted" stroke="var(--text-dim)" tickFormatter={tickFmt} />
                        <YAxis type="number" dataKey="y" name="Residual Error" stroke="var(--text-dim)" tickFormatter={tickFmt} />
                        <Tooltip content={<CustomTooltip />} />
                        <Scatter name="Residuals" data={result.charts.residuals} fill="var(--accent-purple)" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {result.charts.coefs?.length > 0 && (
                  <div className="panel">
                    <h2 className="panel-title">
                      <BarChart3 size={18} color="var(--primary)" /> Feature Coefficients / Weights
                    </h2>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={result.charts.coefs}
                          layout="vertical"
                          margin={{ top: 8, right: 24, bottom: 8, left: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis type="number" stroke="var(--text-dim)" fontSize={12} tickFormatter={tickFmt} />
                          <YAxis type="category" dataKey="feature" stroke="var(--text-dim)" fontSize={12} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" fill="var(--accent-emerald)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}

            {result.technique === "clustering" && (
              <>
                <div className="panel">
                  <h2 className="panel-title">
                    <Boxes size={18} color="var(--primary)" /> 2D PCA Cluster Map
                  </h2>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={CHART_MARGIN}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" dataKey="x" name="PC1" stroke="var(--text-dim)" tickFormatter={tickFmt} />
                        <YAxis type="number" dataKey="y" name="PC2" stroke="var(--text-dim)" tickFormatter={tickFmt} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        {Object.entries(result.charts.scatter).map(([cName, points], idx) => (
                          <Scatter
                            key={cName}
                            name={cName}
                            data={points}
                            fill={cName.includes("Noise") ? "var(--accent-rose)" : PALETTE[idx % PALETTE.length]}
                          />
                        ))}
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {result.charts.elbow?.length > 0 && (
                  <div className="panel">
                    <h2 className="panel-title">
                      <TrendingUp size={18} color="var(--primary)" /> Elbow Method (Inertia vs K)
                    </h2>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={result.charts.elbow} margin={CHART_MARGIN}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="k" stroke="var(--text-dim)" label={{ value: "Number of Clusters (k)", position: "insideBottom", offset: -4 }} />
                          <YAxis stroke="var(--text-dim)" tickFormatter={tickFmt} />
                          <Tooltip content={<CustomTooltip />} />
                          <Line type="monotone" dataKey="inertia" stroke="var(--accent-amber)" strokeWidth={3} dot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="panel">
                  <h2 className="panel-title">
                    <TableIcon size={18} color="var(--primary)" /> Cluster Feature Profiles (Averages)
                  </h2>
                  <DataTable rows={result.charts.profiles} maxRows={10} />
                </div>
              </>
            )}

            {result.technique === "association" && (
              <>
                <div className="panel">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <h2 className="panel-title">
                      <ShoppingCart size={18} color="var(--primary)" /> Discovered Association Rules (Sorted by Lift)
                    </h2>
                    <input
                      type="text"
                      placeholder="Filter rules by item (e.g. Milk)..."
                      className="input-text"
                      style={{ maxWidth: 240 }}
                      value={ruleSearch}
                      onChange={(e) => setRuleSearch(e.target.value)}
                    />
                  </div>
                  <DataTable
                    rows={result.charts.rules.filter(
                      (r) =>
                        !ruleSearch ||
                        r.if.toLowerCase().includes(ruleSearch.toLowerCase()) ||
                        r.then.toLowerCase().includes(ruleSearch.toLowerCase())
                    )}
                    cols={["if", "then", "support", "confidence", "lift", "leverage"]}
                    maxRows={15}
                  />
                </div>

                {result.charts.itemsets?.length > 0 && (
                  <div className="panel">
                    <h2 className="panel-title">
                      <BarChart3 size={18} color="var(--primary)" /> Most Frequent Itemsets
                    </h2>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={result.charts.itemsets}
                          layout="vertical"
                          margin={{ top: 8, right: 24, bottom: 8, left: 80 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis type="number" stroke="var(--text-dim)" fontSize={12} tickFormatter={tickFmt} />
                          <YAxis type="category" dataKey="items" stroke="var(--text-dim)" fontSize={12} width={130} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="support" fill="var(--accent-purple)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}

            {result.technique === "outlier" && (
              <>
                <div className="panel">
                  <h2 className="panel-title">
                    <ShieldAlert size={18} color="var(--primary)" /> Normal vs Outlier Distribution (2D PCA)
                  </h2>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={CHART_MARGIN}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis type="number" dataKey="x" name="PC1" stroke="var(--text-dim)" tickFormatter={tickFmt} />
                        <YAxis type="number" dataKey="y" name="PC2" stroke="var(--text-dim)" tickFormatter={tickFmt} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Scatter name="Normal" data={result.charts.scatter.Normal} fill="#94a3b8" />
                        <Scatter name="Outliers" data={result.charts.scatter.Outlier} fill="var(--accent-rose)" />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="panel">
                  <h2 className="panel-title">
                    <AlertTriangle size={18} color="var(--accent-rose)" /> Flagged Anomaly Observations
                  </h2>
                  <DataTable rows={result.charts.flagged} maxRows={10} />
                </div>
              </>
            )}

            {/* ========================================================================
                Interactive What-If Live Inference Simulator (Inference Playground)
                ======================================================================== */}
            {(result.technique === "classification" || result.technique === "regression") && (
              <div className="simulator-box">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <Brain size={20} color="var(--primary)" />
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: 700, margin: 0 }}>
                      What-If Live Inference Simulator
                    </h3>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>
                      Test your trained {result.algorithm.replace("_", " ")} model in real-time with custom feature values.
                    </p>
                  </div>
                </div>

                <div className="form-grid" style={{ marginTop: 16 }}>
                  {(result.summary.features_used || result.summary.coefficients?.map((c) => c.feature) || []).map((feat) => (
                    <div key={feat} className="form-group">
                      <label>{feat.replace(/_/g, " ")}</label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Enter value..."
                        className="input-text"
                        value={whatIfValues[feat] ?? ""}
                        onChange={(e) => setWhatIfValues({ ...whatIfValues, [feat]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>

                <button
                  className="btn btn-primary"
                  style={{ marginTop: 8 }}
                  disabled={busy === "predict"}
                  onClick={executeWhatIfPrediction}
                >
                  <Play size={15} fill="currentColor" />
                  {busy === "predict" ? "Running Prediction..." : "Predict Now"}
                </button>

                {/* Prediction Output Display */}
                {whatIfPrediction && (
                  <div className="prediction-result-card">
                    <div>
                      <div className="prediction-label">
                        Predicted {whatIfPrediction.target}:
                      </div>
                      <div className="prediction-value">{whatIfPrediction.prediction}</div>
                      {whatIfPrediction.confidence && (
                        <div style={{ fontSize: "12px", color: "var(--accent-emerald)", marginTop: 2 }}>
                          Confidence: {whatIfPrediction.confidence}%
                        </div>
                      )}
                    </div>

                    {whatIfPrediction.probabilities?.length > 0 && (
                      <div style={{ minWidth: 200 }}>
                        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", marginBottom: 4 }}>
                          Class Probabilities:
                        </div>
                        {whatIfPrediction.probabilities.map((prob) => (
                          <div key={prob.class} style={{ marginBottom: 6 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                              <span>{prob.class}</span>
                              <b>{prob.probability}%</b>
                            </div>
                            <div className="prob-bar">
                              <div className="prob-fill" style={{ width: `${prob.probability}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* AI & Built-in Analytical Explainer */}
            <div className="panel" style={{ marginTop: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h2 className="panel-title">
                  <Brain size={18} color="var(--primary)" /> Academic Analysis & Practical Takeaways
                </h2>
                {!ai && (
                  <button className="btn btn-secondary" disabled={busy === "explain"} onClick={generateExplanation}>
                    {busy === "explain" ? "Analyzing..." : "Generate Academic Explanation"}
                  </button>
                )}
              </div>

              {ai && (
                <div>
                  <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontSize: "14px", color: "var(--text-main)" }}>
                    {ai.text}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: 12 }}>
                    Source: {ai.source}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
              <button className="btn btn-secondary" onClick={() => setStep(2)}>
                ← Try Another Algorithm / Hyperparameters
              </button>
              <button className="btn btn-primary" onClick={() => setStep(0)}>
                Select Another Dataset
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ==============================================================================
          Viva Prep & Mathematical Theory Guide Drawer / Modal
          ============================================================================== */}
      {vivaOpen && (
        <div className="modal-overlay" onClick={() => setVivaOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="panel-title">
                <BookOpen size={18} color="var(--primary)" /> Viva & Theory Reference Center
              </h2>
              <button className="btn btn-secondary" style={{ padding: "4px 10px" }} onClick={() => setVivaOpen(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body">
              <h3 style={{ fontSize: "16px", color: "var(--primary)", marginBottom: 8 }}>
                Mathematical Formulations:
              </h3>
              <ul style={{ paddingLeft: 20, marginBottom: 20 }}>
                {tech === "classification" && (
                  <>
                    <li><code>Accuracy = (TP + TN) / (TP + TN + FP + FN)</code></li>
                    <li><code>Precision = TP / (TP + FP)</code></li>
                    <li><code>Recall = TP / (TP + FN)</code></li>
                    <li><code>F1-Score = 2 * (Precision * Recall) / (Precision + Recall)</code></li>
                  </>
                )}
                {tech === "regression" && (
                  <>
                    <li><code>R² Score = 1 - (SS_res / SS_tot)</code></li>
                    <li><code>RMSE = sqrt( (1/n) * sum((y - y_pred)²) )</code></li>
                    <li><code>MAE = (1/n) * sum( |y - y_pred| )</code></li>
                  </>
                )}
                {tech === "clustering" && (
                  <>
                    <li><code>Silhouette Coefficient = (b - a) / max(a, b)  [-1 to +1]</code></li>
                    <li><code>Inertia = sum( min( ||x_i - c_k||² ) )</code></li>
                  </>
                )}
                {tech === "association" && (
                  <>
                    <li><code>Support(A → B) = Count(A ∪ B) / N</code></li>
                    <li><code>Confidence(A → B) = Support(A ∪ B) / Support(A)</code></li>
                    <li><code>Lift(A → B) = Confidence / Support(B)</code></li>
                  </>
                )}
                {tech === "outlier" && (
                  <>
                    <li><code>Z-Score = (x - mean) / std</code></li>
                    <li><code>IQR Rule = Q1 - 1.5×IQR or Q3 + 1.5×IQR</code></li>
                  </>
                )}
              </ul>

              <h3 style={{ fontSize: "16px", color: "var(--accent-purple)", marginBottom: 8 }}>
                Frequent Viva Exam Questions & Answers:
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: "var(--bg-subtle)", padding: 12, borderRadius: "var(--radius-md)" }}>
                  <b>Q: How did you handle data preprocessing in your pipeline?</b>
                  <p style={{ marginTop: 4, color: "var(--text-muted)" }}>
                    A: We implemented systematic imputation (mean for continuous, mode for categorical), filtered outliers via IQR/Z-Score, removed duplicate entries, and standardized continuous variables via StandardScaler or MinMaxScaler.
                  </p>
                </div>
                <div style={{ background: "var(--bg-subtle)", padding: 12, borderRadius: "var(--radius-md)" }}>
                  <b>Q: What validation methodology prevents overfitting?</b>
                  <p style={{ marginTop: 4, color: "var(--text-muted)" }}>
                    A: We utilized stratified train/test hold-out splits (typically 75/25) so that model performance is measured strictly on unseen evaluation data.
                  </p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setVivaOpen(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================================
          Official Printable Academic Project Report Modal
          ============================================================================== */}
      {reportModal && (
        <div className="modal-overlay" onClick={() => setReportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="panel-title">
                <FileText size={18} color="var(--primary)" /> Academic Laboratory Project Report
              </h2>
              <button className="btn btn-secondary" style={{ padding: "4px 10px" }} onClick={() => setReportModal(false)}>
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
              {reportMarkdown}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setReportModal(false)}>
                Close
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  navigator.clipboard.writeText(reportMarkdown);
                  alert("Report copied to clipboard!");
                }}
              >
                Copy Markdown
              </button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} /> Print / Save as PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
