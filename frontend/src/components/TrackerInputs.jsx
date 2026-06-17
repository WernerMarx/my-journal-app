import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import {
  createTracker,
  getEntryTrackers,
  listTrackers,
  setEntryTrackers,
} from "../api/trackers";
import TrackerForm from "./TrackerForm";

/**
 * Per-day tracker values. A day shows only the trackers that have a value (plus
 * any added during this editing session); each can be removed from the day, and
 * more can be added — either picked from the user's existing trackers or created
 * on the spot.
 *
 * The parent owns the save flow: it must ensure the entry exists (the values
 * endpoint 404s otherwise), then call the exposed `save()`. Only the currently
 * shown trackers are sent; anything removed/omitted is cleared server-side.
 *
 * Each tracker renders by `data_type`:
 *   BOOLEAN → checkbox (definite yes/no)   OPTION → select
 *   INTEGER / FLOAT → number input (empty = unset, bounds from config)
 *   TEXT → text input
 */
const TrackerInputs = forwardRef(function TrackerInputs({ date }, ref) {
  // all active tracker definitions (used by the "add existing" picker)
  const [allTrackers, setAllTrackers] = useState([]);
  // ids of trackers currently displayed for this day, in order
  const [shownIds, setShownIds] = useState([]);
  // { [trackerId]: editable value }
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false); // add panel open?
  const [creating, setCreating] = useState(false); // create-on-the-spot form open?
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    // The entry-trackers endpoint returns definitions + values when the entry
    // exists; on 404 (no entry yet) fall back to bare definitions so we can
    // still render an add control for a brand-new day.
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
        setAllTrackers(loaded.map((i) => i.tracker));
        setValues(Object.fromEntries(loaded.map((i) => [i.tracker.id, i.value ?? ""])));
        // Show only the trackers that already have a value for this day.
        setShownIds(loaded.filter((i) => i.value != null).map((i) => i.tracker.id));
        setAdding(false);
        setCreating(false);
      })
      .catch(() => {
        if (!active) return;
        setAllTrackers([]);
        setShownIds([]);
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [date]);

  useImperativeHandle(ref, () => ({
    /** PUT the currently shown trackers' values for this day. Removed/omitted
     * trackers are cleared server-side. Caller must ensure the entry exists. */
    async save() {
      const byId = Object.fromEntries(allTrackers.map((t) => [t.id, t]));
      const payload = shownIds
        .map((id) => byId[id])
        .filter(Boolean)
        .map((tracker) => ({
          tracker: tracker.id,
          value: normalize(tracker.data_type, values[tracker.id]),
        }));
      await setEntryTrackers(date, payload);
    },
  }));

  function setValue(id, value) {
    setValues((prev) => ({ ...prev, [id]: value }));
  }

  function removeFromDay(id) {
    setShownIds((prev) => prev.filter((x) => x !== id));
  }

  function addExisting(id) {
    if (!id) return;
    setShownIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setValue(id, values[id] ?? "");
    setAdding(false);
  }

  async function handleCreate(payload) {
    setError(null);
    try {
      const created = await createTracker(payload);
      setAllTrackers((prev) => [...prev, created]);
      setValues((prev) => ({ ...prev, [created.id]: "" }));
      setShownIds((prev) => [...prev, created.id]);
      setCreating(false);
      setAdding(false);
    } catch (err) {
      const detail = err.response?.data;
      setError(
        typeof detail === "object"
          ? Object.values(detail).flat().join(" ")
          : "Could not create that tracker.",
      );
      throw err; // keep the create form open on failure
    }
  }

  if (loading) return null;

  const byId = Object.fromEntries(allTrackers.map((t) => [t.id, t]));
  const shown = shownIds.map((id) => byId[id]).filter(Boolean);
  const available = allTrackers.filter((t) => !shownIds.includes(t.id));

  return (
    <fieldset style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 4, padding: 12 }}>
      <legend style={{ color: "#555", padding: "0 6px" }}>Trackers</legend>

      {error && <p style={{ color: "red", marginTop: 0 }}>{error}</p>}

      <div style={{ display: "grid", gap: 10 }}>
        {shown.map((tracker) => (
          <div key={tracker.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ flex: "0 0 140px", color: "#333" }}>{tracker.name}</span>
            {renderWidget(tracker, values[tracker.id], (v) => setValue(tracker.id, v))}
            <button
              type="button"
              onClick={() => removeFromDay(tracker.id)}
              title={`Remove ${tracker.name} from this day`}
              aria-label={`Remove ${tracker.name} from this day`}
              style={{ marginLeft: "auto", color: "#c0392b", border: "none", background: "none", cursor: "pointer", fontSize: 16 }}
            >
              ✕
            </button>
          </div>
        ))}
        {shown.length === 0 && !adding && (
          <p style={{ color: "#999", margin: 0 }}>No trackers for this day yet.</p>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        {!adding && !creating && (
          <button type="button" onClick={() => setAdding(true)} style={{ padding: "6px 14px" }}>
            + Add tracker
          </button>
        )}

        {adding && !creating && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {available.length > 0 ? (
              <select
                defaultValue=""
                onChange={(e) => addExisting(e.target.value)}
                style={{ padding: 6 }}
              >
                <option value="" disabled>
                  Choose an existing tracker…
                </option>
                {available.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <span style={{ color: "#999" }}>All your trackers are already shown.</span>
            )}
            <button type="button" onClick={() => setCreating(true)} style={{ padding: "6px 14px" }}>
              Create new
            </button>
            <button type="button" onClick={() => setAdding(false)} style={{ padding: "6px 14px" }}>
              Cancel
            </button>
          </div>
        )}

        {creating && (
          <div style={{ marginTop: 4 }}>
            <p style={{ fontSize: 13, color: "#777", margin: "0 0 8px" }}>
              New trackers are permanent — they appear in Manage Trackers and on other days too.
            </p>
            <TrackerForm
              submitLabel="Create & add"
              onSubmit={handleCreate}
              onCancel={() => {
                setCreating(false);
                setError(null);
              }}
            />
          </div>
        )}
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
