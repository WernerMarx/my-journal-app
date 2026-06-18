import { useEffect, useState } from "react";
import { PlusCircle } from "lucide-react";
import { createTracker, deleteTracker, listTrackers, updateTracker } from "../api/trackers";
import TrackerForm from "../components/TrackerForm";
import PageHeader from "../components/layout/PageHeader";
import ErrorState from "../components/ui-kit/ErrorState";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";

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
  const [showCreate, setShowCreate] = useState(false);
  const [createKey, setCreateKey] = useState(0);

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
      setCreateKey((k) => k + 1);
      setShowCreate(false);
      reload();
    } catch (err) {
      setError(errorText(err, "Could not create that tracker."));
      throw err; // keep the create form open on failure
    }
  }

  return (
    <div>
      <PageHeader
        title="Trackers"
        subtitle="Manage your daily tracking fields"
        action={
          !showCreate && (
            <Button onClick={() => setShowCreate(true)} className="gap-2">
              <PlusCircle className="w-4 h-4" />
              Add tracker
            </Button>
          )
        }
      />

      {error && <ErrorState message={error} className="mb-5" />}

      {/* ── Create form ── */}
      {showCreate && (
        <div className="mb-8">
          <p className="text-sm font-medium text-foreground mb-3">New tracker</p>
          <TrackerForm
            key={createKey}
            submitLabel="Add tracker"
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {/* ── Tracker list ── */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl"
            >
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-8 w-20 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {trackers.map((t) =>
            editingId === t.id ? (
              <div key={t.id}>
                <TrackerForm
                  initial={t}
                  lockKeyType
                  submitLabel="Save changes"
                  onSubmit={(payload) => handleEditSave(t.id, payload)}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <div
                key={t.id}
                className="flex items-center justify-between gap-4 px-4 py-3 bg-card border border-border rounded-xl"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{t.name}</span>
                    {t.is_system && (
                      <Badge variant="secondary" className="text-[11px] py-0 h-5">
                        default
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.key} · {t.data_type}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setEditingId(t.id)}>
                    Edit
                  </Button>
                  {t.is_system ? (
                    <span className="text-xs text-muted-foreground px-2">locked</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(t)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                    >
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
