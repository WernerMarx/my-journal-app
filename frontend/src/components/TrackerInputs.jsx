import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { getEntryTrackers, listTrackers, setEntryTrackers } from "../api/trackers";

/**
 * Renders an input for each of the user's active trackers and edits their
 * values for a given day. The parent owns the save flow: it must ensure the
 * entry exists (the values endpoint 404s otherwise), then call the exposed
 * `save()` — so trackers are persisted together with the entry's title/body.
 *
 * Each tracker renders by `data_type`:
 *   BOOLEAN → checkbox (definite yes/no)   OPTION → select
 *   INTEGER / FLOAT → number input (empty = unset, bounds from config)
 *   TEXT → text input
 */
const TrackerInputs = forwardRef(function TrackerInputs({ date }, ref) {
  // items: [{ tracker, value }] — the definitions plus their loaded values.
  const [items, setItems] = useState([]);
  // values: { [trackerId]: editable value }
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);

    // The entry-trackers endpoint returns definitions + values when the entry
    // exists; on 404 (no entry yet) fall back to bare definitions so we can
    // still render blank widgets for a brand-new day.
    getEntryTrackers(date)
      .catch((err) => {
        if (err.response?.status === 404) {
          return listTrackers().then((data) =>
            data.results.map((tracker) => ({ tracker, value: null })),
          );
        }
        throw err;
      })
      .then((loaded) => {
        if (!active) return;
        setItems(loaded);
        setValues(
          Object.fromEntries(loaded.map((i) => [i.tracker.id, i.value ?? ""])),
        );
      })
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [date]);

  useImperativeHandle(ref, () => ({
    /** PUT the current values for this day. Caller must ensure the entry exists. */
    async save() {
      const payload = items.map(({ tracker }) => ({
        tracker: tracker.id,
        value: normalize(tracker.data_type, values[tracker.id]),
      }));
      await setEntryTrackers(date, payload);
    },
  }));

  function setValue(id, value) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <fieldset style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 4, padding: 12 }}>
      <legend style={{ color: "#555", padding: "0 6px" }}>Trackers</legend>
      <div style={{ display: "grid", gap: 10 }}>
        {items.map(({ tracker }) => (
          <label key={tracker.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: "0 0 140px", color: "#333" }}>{tracker.name}</span>
            {renderWidget(tracker, values[tracker.id], (v) => setValue(tracker.id, v))}
          </label>
        ))}
      </div>
    </fieldset>
  );
});

function renderWidget(tracker, value, onChange) {
  const { data_type: type, config = {} } = tracker;
  const field = { padding: 6, boxSizing: "border-box" };

  if (type === "BOOLEAN") {
    return (
      <input
        type="checkbox"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
      />
    );
  }

  if (type === "OPTION") {
    return (
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={field}>
        <option value="">—</option>
        {(config.options || []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  if (type === "INTEGER" || type === "FLOAT") {
    const hasBounds = config.min != null && config.max != null;
    return (
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="number"
          value={value ?? ""}
          min={config.min ?? undefined}
          max={config.max ?? undefined}
          step={type === "INTEGER" ? 1 : "any"}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...field, width: 120 }}
        />
        {hasBounds && (
          <span style={{ color: "#999", fontSize: 13 }}>
            ({config.min}–{config.max})
          </span>
        )}
      </span>
    );
  }

  // TEXT
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...field, flex: 1 }}
    />
  );
}

/** Coerce a widget's editable value into the typed value the API expects,
 * mapping empty/blank to null so the server clears that tracker. */
function normalize(type, value) {
  if (type === "BOOLEAN") return value === true;
  if (value === "" || value == null) return null;
  if (type === "INTEGER") {
    const n = parseInt(value, 10);
    return Number.isNaN(n) ? null : n;
  }
  if (type === "FLOAT") {
    const n = parseFloat(value);
    return Number.isNaN(n) ? null : n;
  }
  return value; // TEXT, OPTION
}

export default TrackerInputs;
