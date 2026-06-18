import { useEffect, useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import EntryEditor from "../components/EntryEditor";
import { addDays, todayISO } from "../api/entries";

/**
 * Write page — today's entry by default, or any day via `/write/:date`.
 * All navigation/blocker/beforeunload logic is unchanged; only the header
 * date-picker row has been restyled.
 */
export default function Write() {
  const navigate = useNavigate();
  const { date: dateParam } = useParams();
  const today = todayISO();
  const date = dateParam || today;
  const [dirty, setDirty] = useState(false);

  // Block in-app navigation while edits are pending.
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (window.confirm("You have unsaved changes. Leave without saving?")) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  // Warn on tab close / refresh while edits are pending.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function goToDate(iso) {
    navigate(iso === today ? "/write" : `/write/${iso}`);
  }

  return (
    <div className="space-y-6">
      {/* ── Date navigation ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => goToDate(addDays(date, -1))}
          title="Previous day"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Custom-styled date trigger — invisible native input sits on top */}
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors select-none">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            {formatDisplayDate(date)}
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && goToDate(e.target.value)}
            aria-label="Select date"
            className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
          />
        </div>

        <button
          onClick={() => goToDate(addDays(date, 1))}
          title="Next day"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {date !== today && (
          <button
            onClick={() => goToDate(today)}
            className="ml-1 text-xs font-medium text-primary hover:text-primary/80 px-2.5 py-1.5 rounded-md hover:bg-accent transition-colors"
          >
            Today
          </button>
        )}
      </div>

      <EntryEditor key={date} date={date} onDirtyChange={setDirty} />
    </div>
  );
}

function formatDisplayDate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
