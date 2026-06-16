import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createTracker, deleteTracker, listTrackers, DATA_TYPES } from "../api/trackers";

/**
 * Manage tracker definitions: list active trackers (system + custom), create
 * new custom ones, and soft-delete custom ones. System trackers (the seeded
 * worked_out / mood / diet) are locked — they cannot be deleted.
 */
export default function ManageTrackers() {
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function reload() {
    setLoading(true);
    listTrackers()
      .then((data) => setTrackers(data.results))
      .catch(() => setError("Could not load trackers."))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  async function handleDelete(tracker) {
    if (!window.confirm(`Archive "${tracker.name}"? Past values are kept.`)) return;
    try {
      await deleteTracker(tracker.id);
      reload();
    } catch {
      setError("Could not archive that tracker.");
    }
  }

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Trackers</h1>
        <Link to="/">← Back to journal</Link>
      </header>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 20 }}>
          {trackers.map((t) => (
            <li
              key={t.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 12px",
                border: "1px solid #ddd",
                borderRadius: 4,
                marginBottom: 8,
              }}
            >
              <span>
                <strong>{t.name}</strong>{" "}
                <span style={{ color: "#999", fontSize: 13 }}>
                  {t.key} · {t.data_type}
                </span>
                {t.is_system && (
                  <span style={{ marginLeft: 8, color: "#888", fontSize: 12 }}>(default)</span>
                )}
              </span>
              {t.is_system ? (
                <span style={{ color: "#bbb", fontSize: 13 }}>locked</span>
              ) : (
                <button onClick={() => handleDelete(t)}>Archive</button>
              )}
            </li>
          ))}
        </ul>
      )}

      <NewTrackerForm onCreated={reload} onError={setError} />
    </div>
  );
}

/** Inline form to create a custom tracker; config fields adapt to the type. */
function NewTrackerForm({ onCreated, onError }) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [dataType, setDataType] = useState("TEXT");
  const [options, setOptions] = useState(""); // comma-separated, for OPTION
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isOption = dataType === "OPTION";
  const isNumeric = dataType === "INTEGER" || dataType === "FLOAT";

  function buildConfig() {
    if (isOption) {
      const list = options
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      return { options: list };
    }
    if (isNumeric) {
      const config = {};
      if (min !== "") config.min = Number(min);
      if (max !== "") config.max = Number(max);
      return config;
    }
    return {};
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    onError(null);
    try {
      await createTracker({ key, name, data_type: dataType, config: buildConfig() });
      setKey("");
      setName("");
      setDataType("TEXT");
      setOptions("");
      setMin("");
      setMax("");
      onCreated();
    } catch (err) {
      const detail = err.response?.data;
      onError(
        typeof detail === "object"
          ? Object.values(detail).flat().join(" ")
          : "Could not create that tracker.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const field = { padding: 6, boxSizing: "border-box" };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ marginTop: 24, padding: 16, border: "1px solid #ddd", borderRadius: 4 }}
    >
      <h3 style={{ marginTop: 0 }}>Add a tracker</h3>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#555" }}>Key (stable id, e.g. sleep)</span>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            pattern="[-a-zA-Z0-9_]+"
            title="Letters, numbers, hyphens and underscores only"
            style={field}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#555" }}>Name (display label)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required style={field} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#555" }}>Type</span>
          <select value={dataType} onChange={(e) => setDataType(e.target.value)} style={field}>
            {DATA_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        {isOption && (
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 13, color: "#555" }}>Options (comma-separated)</span>
            <input
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="good, neutral, bad"
              required
              style={field}
            />
          </label>
        )}

        {isNumeric && (
          <>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 13, color: "#555" }}>Min (optional)</span>
              <input
                type="number"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                style={field}
              />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 13, color: "#555" }}>Max (optional)</span>
              <input
                type="number"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                style={field}
              />
            </label>
          </>
        )}
      </div>
      <button type="submit" disabled={submitting} style={{ marginTop: 12, padding: "8px 20px" }}>
        {submitting ? "Adding…" : "Add tracker"}
      </button>
    </form>
  );
}
