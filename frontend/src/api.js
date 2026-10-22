const BASE = import.meta.env.VITE_API || "http://localhost:8000";

async function call(path, opts = {}) {
  try {
    const res = await fetch(BASE + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Request failed");
    return data;
  } catch (err) {
    if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError") || err.message.includes("Load failed"))) {
      throw new Error("Cannot connect to AutoMiner backend server. Please ensure the backend is running on http://localhost:8000.");
    }
    throw err;
  }
}

const post = (path, body) =>
  call(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const api = {
  health: () => call("/health"),
  samples: () => call("/samples"),
  loadSample: (key) => call(`/samples/${key}`, { method: "POST" }),
  upload: (file) => {
    const f = new FormData();
    f.append("file", file);
    return call("/upload", { method: "POST", body: f });
  },
  eda: (datasetId) => call(`/eda/${datasetId}`),
  preprocess: (body) => post("/preprocess", body),
  run: (technique, body) => post(`/run/${technique}`, body),
  predict: (body) => post("/predict", body),
  explain: (body) => post("/explain", body),
  exportReport: (body) => post("/export-report", body),
};
