import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Plus, Search } from "lucide-react";
import { searchEntries } from "../api/search";
import PageHeader from "../components/layout/PageHeader";
import EmptyState from "../components/ui-kit/EmptyState";
import ErrorState from "../components/ui-kit/ErrorState";
import { EntryListSkeleton } from "../components/ui-kit/LoadingState";
import { Button, buttonVariants } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { cn } from "../lib/utils";

/**
 * Browse / search page. All state, effects, and API calls are unchanged from
 * the original — only the JSX has been redesigned.
 */
export default function Browse() {
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
    return () => { active = false; };
  }, [applied, page]);

  function handleSubmit(e) {
    e.preventDefault();
    setPage(1);
    setApplied(draft);
  }

  const results = data?.results ?? [];
  const pageSize = 20;
  const totalPages = data ? Math.max(1, Math.ceil(data.count / pageSize)) : 1;
  const hasFilters = applied.q || applied.dateFrom || applied.dateTo;

  return (
    <div>
      <PageHeader
        title="Browse"
        subtitle="Search and explore your entries"
        action={
          <Link
            to="/write"
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <Plus className="w-4 h-4" />
            New Entry
          </Link>
        }
      />

      {/* ── Search filters ── */}
      <Card className="mb-6">
        <CardContent className="p-5">
          <form onSubmit={handleSubmit}>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Search
                  <span className="font-normal ml-1 opacity-70">(*term* contains, "phrase")</span>
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <Input
                    value={draft.q}
                    onChange={(e) => setDraft({ ...draft, q: e.target.value })}
                    placeholder="Search title and body…"
                    className="pl-9"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">From</label>
                <Input
                  type="date"
                  value={draft.dateFrom}
                  onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value })}
                  className="w-36"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">To</label>
                <Input
                  type="date"
                  value={draft.dateTo}
                  onChange={(e) => setDraft({ ...draft, dateTo: e.target.value })}
                  className="w-36"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Sort</label>
                <select
                  value={draft.sort}
                  onChange={(e) => setDraft({ ...draft, sort: e.target.value })}
                  className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="relevance">Relevance</option>
                  <option value="date">Date</option>
                  <option value="title">Title</option>
                </select>
              </div>

              <Button type="submit" className="gap-2">
                <Search className="w-4 h-4" />
                Search
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Error ── */}
      {error && <ErrorState message={error} className="mb-5" />}

      {/* ── Results ── */}
      {loading ? (
        <EntryListSkeleton count={5} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={hasFilters ? "No entries match" : "No entries yet"}
          description={
            hasFilters
              ? "Try broadening your search or adjusting the date range."
              : "Start writing to see your entries here."
          }
          action={
            !hasFilters ? (
              <Link to="/write" className={buttonVariants({ variant: "default" })}>
                Write your first entry
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          {/* Count */}
          <p className="text-xs text-muted-foreground mb-4">
            {data.count} {data.count === 1 ? "entry" : "entries"}
            {applied.q ? <> matching <em>"{applied.q}"</em></> : null}
          </p>

          {/* Entry cards */}
          <div className="space-y-3">
            {results.map((r) => (
              <Card
                key={r.date}
                className="hover:shadow-md transition-shadow duration-150"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: title + snippet */}
                    <div className="flex-1 min-w-0">
                      <Link to={`/entries/${r.date}`} className="group block">
                        <h3 className="font-serif font-semibold text-base text-foreground group-hover:text-primary transition-colors leading-snug">
                          {r.title || "(untitled)"}
                        </h3>
                      </Link>
                      {r.snippet && (
                        <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                          <Snippet text={r.snippet} />
                        </p>
                      )}
                    </div>

                    {/* Right: date + edit */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(r.date)}
                      </time>
                      <Link
                        to={`/write/${r.date}`}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "h-7 text-xs",
                        )}
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ← Prev
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next →
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Format ISO date string as "Jan 15, 2024" in local time. */
function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Render a search snippet, bolding the **…**-delimited matched terms. */
function Snippet({ text }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <strong key={i} className="font-semibold text-foreground">{part}</strong>
          : <span key={i}>{part}</span>,
      )}
    </>
  );
}
