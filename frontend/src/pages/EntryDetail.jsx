import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import AttachmentGallery from "../components/AttachmentGallery";
import ErrorState from "../components/ui-kit/ErrorState";
import EmptyState from "../components/ui-kit/EmptyState";
import { buttonVariants } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { Skeleton } from "../components/ui/skeleton";
import { addDays, getEntry } from "../api/entries";
import { getEntryTrackers } from "../api/trackers";
import { searchEntries } from "../api/search";
import { cn } from "../lib/utils";

/**
 * Read-only view of a single day. All data-fetching and neighbor-resolution
 * logic is unchanged; only the layout and components have been redesigned.
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

    return () => { active = false; };
  }, [date]);

  // Resolve the nearest existing entry on each side.
  const findNeighbors = useCallback(async () => {
    const prevP = searchEntries({ dateTo: addDays(date, -1), sort: "date" }).then(
      (d) => d.results[0]?.date ?? null,
    );
    const nextP = searchEntries({ dateFrom: addDays(date, 1), sort: "date" }).then(
      async (d) => {
        if (d.count === 0) return null;
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
    return () => { active = false; };
  }, [findNeighbors]);

  const filledTrackers = trackers.filter(({ value }) => value != null && value !== "");

  // ── States ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <div className="bg-card border border-border rounded-xl shadow-sm px-8 py-8 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-2/3" />
          <Separator />
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (notFound) {
    return (
      <div className="space-y-6">
        <NavRow date={date} neighbors={neighbors} navigate={navigate} />
        <EmptyState
          icon={PenLine}
          title={`No entry for ${formatDate(date)}`}
          description="This day doesn't have an entry yet."
          action={
            <Link to={`/write/${date}`} className={buttonVariants()}>
              Write this day
            </Link>
          }
        />
      </div>
    );
  }

  // ── Entry view ────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Prev / next + edit action */}
      <NavRow date={date} neighbors={neighbors} navigate={navigate} />

      {/* Main reading surface */}
      <div className="bg-card border border-border rounded-xl shadow-sm px-8 py-8">
        <time className="text-sm font-medium text-muted-foreground">
          {formatDate(date)}
        </time>

        <h1 className="font-serif text-2xl font-semibold text-foreground mt-2 mb-4 leading-snug">
          {entry.title || "(untitled)"}
        </h1>

        {/* Tracker badges */}
        {filledTrackers.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {filledTrackers.map(({ tracker, value }) => (
              <span
                key={tracker.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary text-xs font-medium text-muted-foreground"
              >
                {tracker.name}
                <span className="text-foreground">
                  {tracker.data_type === "BOOLEAN" ? (value ? "✓" : "✗") : value}
                </span>
              </span>
            ))}
          </div>
        )}

        <Separator className="mb-6" />

        <p className="text-base leading-[1.8] text-foreground whitespace-pre-wrap">
          {entry.body}
        </p>
      </div>

      {/* Photos */}
      <div className="bg-card border border-border rounded-xl shadow-sm px-6 py-5">
        <AttachmentGallery date={date} entryExists readOnly />
      </div>
    </div>
  );
}

/** Prev / next navigation row + Edit button. */
function NavRow({ date, neighbors, navigate }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <button
          disabled={!neighbors.prev}
          onClick={() => navigate(`/entries/${neighbors.prev}`)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>
        <span className="text-border text-muted-foreground/30 select-none">|</span>
        <button
          disabled={!neighbors.next}
          onClick={() => navigate(`/entries/${neighbors.next}`)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <Link
        to={`/write/${date}`}
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-2")}
      >
        <PenLine className="w-3.5 h-3.5" />
        Edit entry
      </Link>
    </div>
  );
}

function formatDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
