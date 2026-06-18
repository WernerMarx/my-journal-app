import { forwardRef, useEffect, useImperativeHandle, useState } from "react";
import { Plus, X } from "lucide-react";
import {
  createTracker,
  getEntryTrackers,
  listTrackers,
  setEntryTrackers,
} from "../api/trackers";
import TrackerForm from "./TrackerForm";
import ErrorState from "./ui-kit/ErrorState";

/**
 * Per-day tracker values. All state management and API logic is unchanged;
 * only the layout and widget styling have been redesigned.
 */
const TrackerInputs = forwardRef(function TrackerInputs({ date }, ref) {
  const [allTrackers, setAllTrackers] = useState([]);
  const [shownIds, setShownIds] = useState([]);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

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

    return () => { active = false; };
  }, [date]);

  useImperativeHandle(ref, () => ({
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
      throw err;
    }
  }

  if (loading) return null;

  const byId = Object.fromEntries(allTrackers.map((t) => [t.id, t]));
  const shown = shownIds.map((id) => byId[id]).filter(Boolean);
  const available = allTrackers.filter((t) => !shownIds.includes(t.id));

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Trackers</h3>
        {!adding && !creating && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        )}
      </div>

      {error && <ErrorState message={error} className="mb-3" />}

      {/* Tracker rows */}
      <div className="space-y-2">
        {shown.map((tracker) => (
          <div key={tracker.id} className="flex items-center gap-3 py-1">
            <span className="text-sm text-muted-foreground w-32 shrink-0 truncate">
              {tracker.name}
            </span>
            <div className="flex-1">
              {renderWidget(tracker, values[tracker.id], (v) => setValue(tracker.id, v))}
            </div>
            <button
              type="button"
              onClick={() => removeFromDay(tracker.id)}
              title={`Remove ${tracker.name} from this day`}
              aria-label={`Remove ${tracker.name} from this day`}
              className="p-1 rounded text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {shown.length === 0 && !adding && !creating && (
          <p className="text-sm text-muted-foreground py-0.5">
            No trackers for this day yet.
          </p>
        )}
      </div>

      {/* Add existing picker */}
      {adding && !creating && (
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          {available.length > 0 ? (
            <select
              defaultValue=""
              onChange={(e) => addExisting(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="" disabled>Choose a tracker…</option>
              {available.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          ) : (
            <span className="text-sm text-muted-foreground">All trackers already shown.</span>
          )}
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="text-xs font-medium text-primary hover:text-primary/80 px-2.5 py-1.5 rounded-md hover:bg-accent transition-colors"
          >
            Create new
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="text-xs text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Create-on-the-spot form */}
      {creating && (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">
            New trackers appear on all days and in Manage Trackers.
          </p>
          <TrackerForm
            submitLabel="Create & add"
            onSubmit={handleCreate}
            onCancel={() => { setCreating(false); setError(null); }}
          />
        </div>
      )}
    </div>
  );
});

function renderWidget(tracker, value, onChange) {
  const { data_type: type, config = {} } = tracker;

  if (type === "BOOLEAN") {
    return (
      <input
        type="checkbox"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded cursor-pointer accent-primary"
      />
    );
  }

  if (type === "OPTION") {
    return (
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <option value="">—</option>
        {(config.options || []).map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (type === "INTEGER" || type === "FLOAT") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value ?? ""}
          min={config.min ?? undefined}
          max={config.max ?? undefined}
          step={type === "INTEGER" ? 1 : "any"}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        {config.min != null && config.max != null && (
          <span className="text-xs text-muted-foreground">
            {config.min}–{config.max}
          </span>
        )}
      </div>
    );
  }

  // TEXT
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );
}

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
  return value;
}

export default TrackerInputs;
