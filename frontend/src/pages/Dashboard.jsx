import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PenLine, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { getDashboard } from "@/api/dashboard";
import { todayISO } from "@/api/entries";
import PageHeader from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorState from "@/components/ui-kit/ErrorState";
import { cn } from "@/lib/utils";

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function shiftMonth({ year, month }, delta) {
  let m = month + delta;
  let y = year;
  if (m > 12) { m -= 12; y += 1; }
  if (m < 1)  { m += 12; y -= 1; }
  return { year: y, month: m };
}

function isCurrentMonth({ year, month }) {
  const now = new Date();
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

export default function Dashboard() {
  const [displayed, setDisplayed] = useState(currentYearMonth);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getDashboard(displayed.year, displayed.month)
      .then((d) => active && setData(d))
      .catch(() => active && setError("Could not load dashboard. Please try again."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [displayed.year, displayed.month]);

  const atCurrentMonth = isCurrentMonth(displayed);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Your journaling at a glance"
        action={
          <Link
            to={`/write/${todayISO()}`}
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <PenLine className="w-4 h-4" />
            Write today
          </Link>
        }
      />

      {error && <ErrorState message={error} className="mb-5" />}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <StatCard
          label="Total entries"
          value={loading ? null : data?.total_entries ?? 0}
        />
        <StatCard
          label="Last entry"
          value={loading ? null : formatDate(data?.last_entry_date)}
        />
      </div>

      {/* ── Mood calendar ── */}
      <div className="bg-card border border-border rounded-xl shadow-sm px-6 py-5 w-fit">
        {/* Calendar header: nav + legend */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDisplayed((d) => shiftMonth(d, -1))}
              aria-label="Previous month"
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground min-w-[110px] text-center">
              {monthLabel(displayed.year, displayed.month)}
            </span>
            <button
              onClick={() => setDisplayed((d) => shiftMonth(d, 1))}
              disabled={atCurrentMonth}
              aria-label="Next month"
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">0</span>
            <div
              className="h-2.5 w-16 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, hsl(0 50% 70%), hsl(60 50% 75%), hsl(120 50% 70%))",
              }}
            />
            <span className="text-xs text-muted-foreground">10</span>
          </div>
        </div>

        {loading ? (
          <CalendarSkeleton />
        ) : (
          <MoodCalendar
            year={displayed.year}
            month={displayed.month}
            entryDates={new Set(data?.current_month_entry_dates ?? [])}
            moods={data?.current_month_moods ?? {}}
          />
        )}
      </div>

      {/* ── Quick links ── */}
      <div className="flex gap-3 mt-8">
        <Link to="/browse" className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
          <BookOpen className="w-4 h-4" />
          Browse entries
        </Link>
      </div>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value }) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm px-6 py-5">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      {value === null ? (
        <Skeleton className="h-7 w-24 mt-1" />
      ) : (
        <p className="text-2xl font-serif font-semibold text-foreground">{value}</p>
      )}
    </div>
  );
}

// ── Mood calendar ─────────────────────────────────────────────────────────────

function MoodCalendar({ year, month, entryDates, moods }) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay(); // 0 = Sun
  const today = todayISO();

  return (
    <div className="grid grid-cols-7 gap-1">
      {/* Day-of-week headers */}
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
        <div key={`pad-${i}`} className="h-8" />
      ))}

      {/* Day cells */}
      {Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const iso = isoDate(year, month, day);
        const mood = moods[iso] ?? null;
        const hasEntry = entryDates.has(iso);
        const isToday = iso === today;
        return (
          <DayCell
            key={iso}
            day={day}
            iso={iso}
            mood={mood}
            hasEntry={hasEntry}
            isToday={isToday}
          />
        );
      })}
    </div>
  );
}

function DayCell({ day, iso, mood, hasEntry, isToday }) {
  const bgStyle = mood !== null ? { backgroundColor: moodBgColor(mood) } : undefined;

  const cell = (
    <div
      className={cn(
        "w-9 h-8 flex items-center justify-center rounded-md text-xs font-medium transition-colors select-none",
        mood !== null
          ? "text-foreground/80"
          : hasEntry
          ? "bg-secondary text-foreground"
          : "text-muted-foreground/40",
        isToday && "ring-2 ring-primary ring-offset-1 ring-offset-card",
      )}
      style={bgStyle}
      title={
        mood !== null
          ? `${iso} — mood ${mood.toFixed(1)}`
          : hasEntry
          ? `${iso} — entry (no mood)`
          : iso
      }
    >
      {day}
    </div>
  );

  return hasEntry ? (
    <Link to={`/entries/${iso}`} className="block">
      {cell}
    </Link>
  ) : (
    cell
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 35 }).map((_, i) => (
        <Skeleton key={i} className="w-9 h-8 rounded-md" />
      ))}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(year, month, day) {
  return [year, String(month).padStart(2, "0"), String(day).padStart(2, "0")].join("-");
}

function monthLabel(year, month) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function moodBgColor(score) {
  const pct = Math.max(0, Math.min(10, score)) / 10;
  const hue = Math.round(pct * 120);
  return `hsl(${hue} 50% 70%)`;
}
