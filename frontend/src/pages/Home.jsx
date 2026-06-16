import { useState } from "react";
import { Link } from "react-router-dom";
import { todayISO } from "../api/entries";
import EntryEditor from "../components/EntryEditor";
import RecentEntries from "../components/RecentEntries";
import { useAuth } from "../contexts/AuthContext";

export default function Home() {
  const { user, signOut } = useAuth();
  const [selectedDate, setSelectedDate] = useState(todayISO());
  // Bumped after each save so the recent list re-fetches.
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <h1 style={{ margin: 0 }}>Journal</h1>
        <div style={{ color: "#555", display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/trackers">Manage trackers</Link>
          <span>{user?.email}</span>
          <button onClick={signOut}>Sign out</button>
        </div>
      </header>

      <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
        <main style={{ flex: 2 }}>
          <EntryEditor
            key={selectedDate}
            date={selectedDate}
            onSaved={() => setRefreshKey((k) => k + 1)}
          />
        </main>

        <aside style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Recent</h3>
            <button onClick={() => setSelectedDate(todayISO())}>Today</button>
          </div>
          <div style={{ marginTop: 12 }}>
            <RecentEntries
              refreshKey={refreshKey}
              selectedDate={selectedDate}
              onSelect={setSelectedDate}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
