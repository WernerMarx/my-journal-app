import { useEffect, useState } from "react";
import { createTracker, deleteTracker, listTrackers, updateTracker } from "../api/trackers";
import TrackerForm from "../components/TrackerForm";

/**
 * Manage tracker definitions: list active trackers (system + custom), create
 * new custom ones, edit existing ones, and soft-delete custom ones.
 *
 * Editing covers name + config for every tracker (including the seeded system
 * ones); key and data_type are immutable after creation. System trackers
 * (worked_out / mood / diet) cannot be deleted.
 */
export default function ManageTrackers() {
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [createKey, setCreateKey] = useState(0); // bump to reset the create form

  function reload() {
    setLoading(true);
    listTrackers()
      .then((data) => setTrackers(data.results))
      .catch(() => setError("Could not load trackers."))
      .finally(() => setLoading(false));
  }

  useEffect(reload, []);

  function errorText(err, fallback) {
    const detail = err.response?.data;
    return typeof detail === "object"
      ? Object.values(detail).flat().join(" ")
      : fallback;
  }

  async function handleDelete(tracker) {
    if (!window.confirm(`Archive "${tracker.name}"? Past values are kept.`)) return;
    try {
      await deleteTracker(tracker.id);
      reload();
    } catch {
      setError("Could not archive that tracker.");
    }
  }

  async function handleEditSave(id, payload) {
    setError(null);
    try {
      await updateTracker(id, payload);
      setEditingId(null);
      reload();
    } catch (err) {
      setError(errorText(err, "Could not update that tracker."));
    }
  }

  async function handleCreate(payload) {
    setError(null);
    try {
      await createTracker(payload);
      setCreateKey((k) => k + 1); // reset the create form
      reload();
    } catch (err) {
      setError(errorText(err, "Could not create that tracker."));
      throw err; // keep the create form open on failure
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Trackers</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 20 }}>
          {trackers.map((t) =>
            editingId === t.id ? (
              <li key={t.id} style={{ marginBottom: 8 }}>
                <TrackerForm
                  initial={t}
                  lockKeyType
                  submitLabel="Save changes"
                  onSubmit={(payload) => handleEditSave(t.id, payload)}
                  onCancel={() => setEditingId(null)}
                />
              </li>
            ) : (
              <li
                key={t.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  border: "1px solid #ddd",
                  borderRadius: 4,
                  marginBottom: 8,
                }}
              >
                <span>
                  <strong>{t.name}</strong>{" "}
                  <span style={{ color: "#999", fontSize: 13 }}>
                    {t.key} · {t.data_type}
                  </span>
                  {t.is_system && (
                    <span style={{ marginLeft: 8, color: "#888", fontSize: 12 }}>(default)</span>
                  )}
                </span>
                <span style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setEditingId(t.id)}>Edit</button>
                  {t.is_system ? (
                    <span style={{ color: "#bbb", fontSize: 13, alignSelf: "center" }}>locked</span>
                  ) : (
                    <button onClick={() => handleDelete(t)}>Archive</button>
                  )}
                </span>
              </li>
            ),
          )}
        </ul>
      )}

      <div style={{ marginTop: 24 }}>
        <h3 style={{ marginTop: 0 }}>Add a tracker</h3>
        <TrackerForm key={createKey} submitLabel="Add tracker" onSubmit={handleCreate} />
      </div>
    </div>
  );
}
