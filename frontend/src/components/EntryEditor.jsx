import { useEffect, useRef, useState } from "react";
import { Save } from "lucide-react";
import { createEntry, getEntry, updateEntry } from "../api/entries";
import AttachmentGallery from "./AttachmentGallery";
import TrackerInputs from "./TrackerInputs";
import ErrorState from "./ui-kit/ErrorState";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";

/**
 * Loads the entry for `date`, lets the user edit title + body + trackers,
 * and saves. All API logic is unchanged — only the layout has been redesigned
 * as a document-style writing surface.
 */
export default function EntryEditor({ date, onSaved, onDirtyChange }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(false);
  const trackersRef = useRef(null);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setDirty(false);

    getEntry(date)
      .then((entry) => {
        if (!active) return;
        setTitle(entry.title);
        setBody(entry.body);
        setExists(true);
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 404) {
          setTitle("");
          setBody("");
          setExists(false);
        } else {
          setError("Could not load this entry.");
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [date]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (exists) {
        await updateEntry(date, { title, body });
      } else {
        await createEntry({ date, title, body });
        setExists(true);
      }
      await trackersRef.current?.save();
      setDirty(false);
      onSaved?.();
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl shadow-sm px-8 py-8 space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Separator />
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Writing surface ── */}
      <div className="bg-card border border-border rounded-xl shadow-sm">
        <div className="px-8 pt-7 pb-1">
          {!exists && (
            <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-full mb-4">
              New entry
            </span>
          )}
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setDirty(true); }}
            placeholder="Title"
            className="w-full bg-transparent border-none p-0 font-serif text-2xl font-semibold text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus:shadow-none"
          />
        </div>

        <Separator className="mx-8 my-5" style={{ width: "auto" }} />

        <div className="px-8 pb-8">
          <textarea
            value={body}
            onChange={(e) => { setBody(e.target.value); setDirty(true); }}
            placeholder="Write your entry…"
            rows={18}
            className="w-full bg-transparent border-none p-0 text-base leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0 focus:shadow-none resize-none"
          />
        </div>
      </div>

      {/* ── Trackers ── */}
      <div className="bg-card border border-border rounded-xl shadow-sm px-6 py-5">
        <TrackerInputs ref={trackersRef} date={date} />
      </div>

      {/* ── Photos ── */}
      <div className="bg-card border border-border rounded-xl shadow-sm px-6 py-5">
        <AttachmentGallery date={date} entryExists={exists} />
      </div>

      {/* ── Error ── */}
      {error && <ErrorState message={error} />}

      {/* ── Save action ── */}
      <div className="flex items-center justify-end gap-3 pb-2">
        {dirty && (
          <span className="text-xs text-muted-foreground">Unsaved changes</span>
        )}
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
