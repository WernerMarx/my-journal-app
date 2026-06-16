import { useEffect, useState } from "react";
import { createEntry, getEntry, updateEntry } from "../api/entries";

/**
 * Loads the entry for `date` (or starts a blank one if none exists yet), lets
 * the user edit title + body, and saves — POST when new, PATCH when it exists.
 */
export default function EntryEditor({ date, onSaved }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

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
          // No entry for this day yet — start a fresh one.
          setTitle("");
          setBody("");
          setExists(false);
        } else {
          setError("Could not load this entry.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
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
      onSaved?.();
    } catch {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Loading…</p>;

  const field = { width: "100%", padding: 8, marginTop: 4, boxSizing: "border-box" };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>
        {date}
        {!exists && <span style={{ fontWeight: 400, color: "#888" }}> · new</span>}
      </h2>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        style={field}
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your entry…"
        rows={16}
        style={{ ...field, marginTop: 12, resize: "vertical" }}
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button onClick={handleSave} disabled={saving} style={{ marginTop: 12, padding: "8px 20px" }}>
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
