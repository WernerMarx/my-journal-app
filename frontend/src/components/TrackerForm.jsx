import { useState } from "react";
import { DATA_TYPES } from "../api/trackers";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { cn } from "../lib/utils";

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

  const selectClass =
    "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-card border border-border rounded-xl shadow-sm p-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Key */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Key (stable id, e.g. sleep){lockKeyType && " — locked"}
          </label>
          <Input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
            disabled={lockKeyType}
            pattern="[-a-zA-Z0-9_]+"
            title="Letters, numbers, hyphens and underscores only"
            className={cn(lockKeyType && "bg-muted text-muted-foreground")}
          />
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Name (display label)
          </label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        {/* Type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Type{lockKeyType && " — locked"}
          </label>
          <select
            value={dataType}
            onChange={(e) => setDataType(e.target.value)}
            disabled={lockKeyType}
            className={cn(selectClass, lockKeyType && "bg-muted text-muted-foreground")}
          >
            {DATA_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* OPTION: comma-separated list */}
        {isOption && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Options (comma-separated)
            </label>
            <Input
              value={options}
              onChange={(e) => setOptions(e.target.value)}
              placeholder="good, neutral, bad"
              required
            />
          </div>
        )}

        {/* NUMERIC: optional bounds */}
        {isNumeric && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Min (optional)</label>
              <Input type="number" value={min} onChange={(e) => setMin(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Max (optional)</label>
              <Input type="number" value={max} onChange={(e) => setMax(e.target.value)} />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 mt-5">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
