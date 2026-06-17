import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchEntries } from "../api/search";

/**
 * Browse / search page. A query box (wildcard syntax per the search API), a
 * date-range filter and a sort selector feed `GET /search/`; results are
 * paginated and each row links to the read-only entry detail. An empty query
 * with a date range is a valid "browse by range".
 */
export default function Browse() {
  // Draft filters (the form) vs. applied filters (what we've actually queried).
  const [draft, setDraft] = useState({ q: "", dateFrom: "", dateTo: "", sort: "relevance" });
  const [applied, setApplied] = useState({ q: "", dateFrom: "", dateTo: "", sort: "relevance" });
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    searchEntries({ ...applied, page })
      .then((d) => active && setData(d))
      .catch(() => active && setError("Search failed. Please try again."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [applied, page]);

  function handleSubmit(e) {
    e.preventDefault();
    setPage(1);
    setApplied(draft);
  }

  const results = data?.results ?? [];
  const pageSize = 20; // matches the API's default page size
  const totalPages = data ? Math.max(1, Math.ceil(data.count / pageSize)) : 1;

  const field = { padding: 6, boxSizing: "border-box" };

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Browse</h1>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end", marginBottom: 20 }}
      >
        <label style={{ display: "grid", gap: 4, flex: "1 1 240px" }}>
          <span style={{ fontSize: 13, color: "#555" }}>Search (*term* contains, term* prefix, "phrase")</span>
          <input
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
            placeholder="Search title and body…"
            style={field}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#555" }}>From</span>
          <input
            type="date"
            value={draft.dateFrom}
            onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value })}
            style={field}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#555" }}>To</span>
          <input
            type="date"
            value={draft.dateTo}
            onChange={(e) => setDraft({ ...draft, dateTo: e.target.value })}
            style={field}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 13, color: "#555" }}>Sort</span>
          <select
            value={draft.sort}
            onChange={(e) => setDraft({ ...draft, sort: e.target.value })}
            style={field}
          >
            <option value="relevance">Relevance</option>
            <option value="date">Date</option>
            <option value="title">Title</option>
          </select>
        </label>
        <button type="submit" style={{ padding: "7px 18px" }}>
          Search
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : results.length === 0 ? (
        <p style={{ color: "#888" }}>
          {applied.q || applied.dateFrom || applied.dateTo
            ? "No entries match those filters."
            : "No entries yet. Start writing to see them here."}
        </p>
      ) : (
        <>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {results.map((r) => (
              <li
                key={r.date}
                style={{ padding: "12px 0", borderBottom: "1px solid #eee" }}
              >
                <Link
                  to={`/entries/${r.date}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <strong>{r.title || "(untitled)"}</strong>
                    <span style={{ color: "#999", fontSize: 13, whiteSpace: "nowrap" }}>{r.date}</span>
                  </div>
                  {r.snippet && (
                    <p style={{ margin: "4px 0 0", color: "#555", fontSize: 14 }}>
                      <Snippet text={r.snippet} />
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ← Prev
              </button>
              <span style={{ color: "#666", fontSize: 14 }}>
                Page {page} of {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Render a search snippet, bolding the **…**-delimited matched terms.
 * The API wraps matches in literal `**` markers (start_sel/stop_sel), so we
 * split on them and bold the odd segments — no HTML injection. */
function Snippet({ text }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
      )}
    </>
  );
}
