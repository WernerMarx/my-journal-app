import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { deleteAttachment, listAttachments, uploadAttachment } from "../api/attachments";
import ErrorState from "./ui-kit/ErrorState";

/**
 * Photo gallery for a given entry date. All upload/delete API logic is
 * unchanged; only the layout has been redesigned.
 */
export default function AttachmentGallery({ date, entryExists, readOnly = false }) {
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!entryExists) return;
    let active = true;
    listAttachments(date)
      .then((data) => { if (active) setAttachments(data); })
      .catch(() => { if (active) setError("Could not load photos."); });
    return () => { active = false; };
  }, [date, entryExists]);

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setUploading(true);
    setError(null);
    try {
      const att = await uploadAttachment(date, file);
      setAttachments((prev) => [...prev, att]);
    } catch (err) {
      const msg =
        err.response?.data?.file?.[0] ||
        err.response?.data?.detail ||
        "Upload failed.";
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(att) {
    try {
      await deleteAttachment(date, att.id);
      setAttachments((prev) => prev.filter((a) => a.id !== att.id));
    } catch {
      setError("Could not delete photo.");
    }
  }

  // ── Not yet saved ─────────────────────────────────────────────────────────

  if (!entryExists) {
    if (readOnly) return null;
    return (
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Photos</h3>
        <p className="text-sm text-muted-foreground">Save the entry first to add photos.</p>
      </div>
    );
  }

  // ── Gallery ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Photos</h3>
        {!readOnly && (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              {uploading ? "Uploading…" : "Add photo"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      {error && <ErrorState message={error} className="mb-3" />}

      {/* Photo grid */}
      {attachments.length > 0 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group relative aspect-square rounded-lg overflow-hidden bg-secondary border border-border"
            >
              {att.is_processed && att.thumbnail_url ? (
                <img src={att.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : att.is_processed && att.file_url ? (
                <img src={att.file_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center w-full h-full text-xs text-muted-foreground">
                  processing…
                </div>
              )}
              {!readOnly && (
                <button
                  onClick={() => handleDelete(att)}
                  title="Remove photo"
                  className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !readOnly && (
          <p className="text-sm text-muted-foreground">No photos yet.</p>
        )
      )}
    </div>
  );
}
