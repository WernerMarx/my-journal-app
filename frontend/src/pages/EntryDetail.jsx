import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AttachmentGallery from "../components/AttachmentGallery";
import { addDays, getEntry } from "../api/entries";
import { getEntryTrackers } from "../api/trackers";
import { searchEntries } from "../api/search";

/**
 * Read-only view of a single day: title, body (whitespace preserved), a compact
 * tracker summary row and the day's photos. "Edit this entry" jumps to the Write
 * page; prev/next arrows skip to the nearest day that actually has an entry.
 */
export default function EntryDetail() {
  const { date } = useParams();
  const navigate = useNavigate();

  const [entry, setEntry] = useState(null);
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);
  const [neighbors, setNeighbors] = useState({ prev: undefined, next: undefined });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setNotFound(false);

    getEntry(date)
      .then((data) => {
        if (!active) return;
        setEntry(data);
        // Tracker values are best-effort — a failure here shouldn't hide the entry.
        return getEntryTrackers(date)
          .then((items) => active && setTrackers(items))
          .catch(() => active && setTrackers([]));
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 404) setNotFound(true);
        else setError("Could not load this entry.");
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [date]);

  // Resolve the nearest existing entry on each side (skips empty days).
  const findNeighbors = useCallback(async () => {
    const prevP = searchEntries({ dateTo: addDays(date, -1), sort: "date" }).then(
      (d) => d.results[0]?.date ?? null, // newest-first → first row is the closest earlier day
    );
    const nextP = searchEntries({ dateFrom: addDays(date, 1), sort: "date" }).then(
      async (d) => {
        if (d.count === 0) return null;
        // newest-first: the closest later day is the last row of the last page.
        const lastPage = Math.ceil(d.count / 20);
        const pageData =
          lastPage === 1
            ? d
            : await searchEntries({ dateFrom: addDays(date, 1), sort: "date", page: lastPage });
        return pageData.results.at(-1)?.date ?? null;
      },
    );
    const [prev, next] = await Promise.all([prevP, nextP]);
    return { prev, next };
  }, [date]);

  useEffect(() => {
    let active = true;
    setNeighbors({ prev: undefined, next: undefined });
    findNeighbors()
      .then((n) => active && setNeighbors(n))
      .catch(() => active && setNeighbors({ prev: null, next: null }));
    return () => {
      active = false;
    };
  }, [findNeighbors]);

  if (loading) return <p>Loading…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  if (notFound) {
    return (
      <div>
        <NavArrows date={date} neighbors={neighbors} navigate={navigate} />
        <h1 style={{ marginTop: 0 }}>{date}</h1>
        <p style={{ color: "#888" }}>No entry written for this day.</p>
        <Link to={`/write/${date}`}>Write this day →</Link>
      </div>
    );
  }

  const summary = formatTrackerSummary(trackers);

  return (
    <div>
      <NavArrows date={date} neighbors={neighbors} navigate={navigate} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ margin: 0 }}>{date}</h1>
        <Link to={`/write/${date}`}>Edit this entry</Link>
      </div>

      <h2 style={{ marginBottom: 4 }}>{entry.title || "(untitled)"}</h2>

      {summary && (
        <p style={{ color: "#555", fontSize: 14, marginTop: 0 }}>{summary}</p>
      )}

      <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{entry.body}</p>

      <AttachmentGallery date={date} entryExists readOnly />
    </div>
  );
}

/** Prev/next navigation between days that have entries. `undefined` = still
 * resolving (disabled), `null` = no neighbor on that side (hidden). */
function NavArrows({ neighbors, navigate }) {
  const arrow = { padding: "4px 12px" };
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <button
        style={arrow}
        disabled={!neighbors.prev}
        onClick={() => navigate(`/entries/${neighbors.prev}`)}
      >
        ← Previous entry
      </button>
      <button
        style={arrow}
        disabled={!neighbors.next}
        onClick={() => navigate(`/entries/${neighbors.next}`)}
      >
        Next entry →
      </button>
    </div>
  );
}

/** Build a compact "Mood 7.5 · Worked out ✓ · Diet 8.0" line from tracker
 * values, skipping any that are unset. */
function formatTrackerSummary(items) {
  const parts = [];
  for (const { tracker, value } of items) {
    if (value == null || value === "") continue;
    if (tracker.data_type === "BOOLEAN") {
      parts.push(`${tracker.name} ${value ? "✓" : "✗"}`);
    } else {
      parts.push(`${tracker.name} ${value}`);
    }
  }
  return parts.join(" · ");
}
