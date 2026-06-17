import { useEffect, useState } from "react";
import { useBlocker, useNavigate, useParams } from "react-router-dom";
import EntryEditor from "../components/EntryEditor";
import { addDays, todayISO } from "../api/entries";

/**
 * Write page — today's entry by default, or any day via `/write/:date`. A
 * date-picker header with prev/next arrows navigates between days; an
 * unsaved-changes guard (in-app via useBlocker, plus a beforeunload handler for
 * tab close/refresh) warns before edits are lost.
 */
export default function Write() {
  const navigate = useNavigate();
  const { date: dateParam } = useParams();
  const today = todayISO();
  const date = dateParam || today;
  const [dirty, setDirty] = useState(false);

  // Block in-app navigation (including switching days) while edits are pending.
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
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function goToDate(iso) {
    navigate(iso === today ? "/write" : `/write/${iso}`);
  }

  const arrow = { padding: "6px 12px", fontSize: 16, lineHeight: 1 };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <button style={arrow} onClick={() => goToDate(addDays(date, -1))} title="Previous day">
          ←
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && goToDate(e.target.value)}
          style={{ padding: 6 }}
        />
        <button style={arrow} onClick={() => goToDate(addDays(date, 1))} title="Next day">
          →
        </button>
        {date !== today && (
          <button style={{ padding: "6px 12px" }} onClick={() => goToDate(today)}>
            Today
          </button>
        )}
      </div>

      <EntryEditor key={date} date={date} onDirtyChange={setDirty} />
    </div>
  );
}
