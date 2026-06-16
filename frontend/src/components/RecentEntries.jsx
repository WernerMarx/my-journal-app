import { useEffect, useState } from "react";
import { listEntries } from "../api/entries";

/** Lists the user's recent entries (most recent first). Re-fetches whenever
 * `refreshKey` changes (e.g. after a save). Selecting one loads it in the editor. */
export default function RecentEntries({ refreshKey, selectedDate, onSelect }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    listEntries()
      .then((data) => active && setEntries(data.results))
      .catch(() => active && setEntries([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (loading) return <p>Loading…</p>;
  if (entries.length === 0) return <p style={{ color: "#888" }}>No entries yet.</p>;

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {entries.map((entry) => (
        <li key={entry.id} style={{ marginBottom: 4 }}>
          <button
            onClick={() => onSelect(entry.date)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "8px 10px",
              border: "1px solid #ddd",
              borderRadius: 4,
              background: entry.date === selectedDate ? "#eef" : "#fff",
              cursor: "pointer",
            }}
          >
            <strong>{entry.date}</strong>
            <br />
            <span style={{ color: "#555" }}>{entry.title || "(untitled)"}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
