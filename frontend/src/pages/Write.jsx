import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import EntryEditor from "../components/EntryEditor";
import { addDays, todayISO } from "../api/entries";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * Write page — today's entry by default, or any day via `/write/:date`.
 * The date button opens a calendar popover for picking any date.
 */
export default function Write() {
  const navigate = useNavigate();
  const { date: dateParam } = useParams();
  const today = todayISO();
  const date = dateParam || today;
  const [dirty, setDirty] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

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
    flushSync(() => setDatePickerOpen(false));
    navigate(iso === today ? "/write" : `/write/${iso}`);
  }

  return (
    <div className="space-y-6">
      {/* ── Date navigation ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => goToDate(addDays(date, -1))}
          title="Previous day"
          aria-label="Previous day"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-secondary transition-colors select-none">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              {formatDisplayDate(date)}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <DatePickerCalendar
              selected={date}
              today={today}
              onSelect={goToDate}
            />
          </PopoverContent>
        </Popover>

        <button
          onClick={() => goToDate(addDays(date, 1))}
          title="Next day"
          aria-label="Next day"
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

// ── Date picker calendar ──────────────────────────────────────────────────────

function DatePickerCalendar({ selected, today, onSelect }) {
  const [y, m] = selected.split("-").map(Number);
  const [viewYear, setViewYear] = useState(y);
  const [viewMonth, setViewMonth] = useState(m); // 1-based

  function shiftMonth(delta) {
    let nm = viewMonth + delta;
    let ny = viewYear;
    if (nm > 12) { nm -= 12; ny += 1; }
    if (nm < 1)  { nm += 12; ny -= 1; }
    setViewYear(ny);
    setViewMonth(nm);
  }

  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay();

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2 px-1">
        <button
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {new Date(viewYear, viewMonth - 1, 1).toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </span>
        <button
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {/* Weekday headers */}
        {WEEK_DAYS.map((wd) => (
          <div
            key={wd}
            className="w-9 h-7 flex items-center justify-center text-[11px] font-medium text-muted-foreground"
          >
            {wd}
          </div>
        ))}

        {/* Leading empty cells */}
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`pad-${i}`} className="w-9 h-9" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const iso = isoDate(viewYear, viewMonth, day);
          const isSelected = iso === selected;
          const isToday = iso === today;

          return (
            <button
              key={iso}
              onClick={() => onSelect(iso)}
              className={cn(
                "w-9 h-9 flex items-center justify-center rounded-md text-sm transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold"
                  : isToday
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-foreground hover:bg-secondary",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(year, month, day) {
  return [year, String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
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
