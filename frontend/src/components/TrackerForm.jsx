import { useState } from "react";
import { DATA_TYPES } from "../api/trackers";

/**
 * Shared form for creating or editing a tracker definition. Builds the typed
 * `config` ({options} for OPTION, {min,max} for numeric) and hands a
 * {key, name, data_type, config} payload to `onSubmit`.
 *
 * In edit mode (`lockKeyType`) the key and data_type fields are shown read-only:
 * both are immutable after creation because changing them would invalidate
 * historical tracker values.
 */
export default function TrackerForm({
  initial = null,
  lockKeyType = false,
  submitLabel = "Save",
  onSubmit,
  onCancel,
}) {
  const cfg = initial?.config || {};
  const [key, setKey] = useState(initial?.key ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [dataType, setDataType] = useState(initial?.data_type ?? "TEXT");
  const [options, setOptions] = useState((cfg.options || []).join(", "));
  const [min, setMin] = useState(cfg.min ?? "");
  const [max, setMax] = useState(cfg.max ?? "");
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
    try {
      const payload = { name, config: buildConfig() };
      // key and data_type are only sent on create; they are immutable after.
      if (!lockKeyType) {
        payload.key = key;
        payload.data_type = dataType;
      }
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  }

  const field = { padding: 6, boxSizing: "border-box" };
  const lockedField = { ...field, background: "#f3f3f3", color: "#777" };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ padding: 16, border: "1px solid #ddd", borderRadius: 4 }}
    >
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#555" }}>
            Key (stable id, e.g. sleep){lockKeyType && " — locked"}
          </span>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            disabled={lockKeyType}
            pattern="[-a-zA-Z0-9_]+"
            title="Letters, numbers, hyphens and underscores only"
            style={lockKeyType ? lockedField : field}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#555" }}>Name (display label)</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required style={field} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#555" }}>
            Type{lockKeyType && " — locked"}
          </span>
          <select
            value={dataType}
            onChange={(e) => setDataType(e.target.value)}
            disabled={lockKeyType}
            style={lockKeyType ? lockedField : field}
          >
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
              <input type="number" value={min} onChange={(e) => setMin(e.target.value)} style={field} />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 13, color: "#555" }}>Max (optional)</span>
              <input type="number" value={max} onChange={(e) => setMax(e.target.value)} style={field} />
            </label>
          </>
        )}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button type="submit" disabled={submitting} style={{ padding: "8px 20px" }}>
          {submitting ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} style={{ padding: "8px 20px" }}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
