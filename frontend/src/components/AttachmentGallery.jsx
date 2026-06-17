import { useEffect, useRef, useState } from "react";
import { deleteAttachment, listAttachments, uploadAttachment } from "../api/attachments";

/**
 * Displays the image gallery for a given entry date and provides an upload button.
 * Only active when the entry already exists (entryExists=true); otherwise shows a hint.
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
      .catch(() => { if (active) setError("Could not load attachments."); });
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
      setError("Could not delete attachment.");
    }
  }

  const container = { marginTop: 16 };
  const grid = {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  };
  const card = {
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: 4,
    overflow: "hidden",
    background: "#f0f0f0",
    border: "1px solid #ddd",
  };
  const img = { width: "100%", height: "100%", objectFit: "cover" };
  const deleteBtn = {
    position: "absolute",
    top: 2,
    right: 2,
    background: "rgba(0,0,0,0.5)",
    color: "#fff",
    border: "none",
    borderRadius: 3,
    cursor: "pointer",
    fontSize: 11,
    lineHeight: 1,
    padding: "2px 4px",
  };
  const processing = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    fontSize: 11,
    color: "#888",
  };

  if (!entryExists) {
    if (readOnly) return null;
    return (
      <p style={{ marginTop: 12, color: "#aaa", fontSize: 13 }}>
        Save the entry first to add photos.
      </p>
    );
  }

  return (
    <div style={container}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <strong style={{ fontSize: 14 }}>Photos</strong>
        {!readOnly && (
          <>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{ padding: "3px 10px", fontSize: 13 }}
            >
              {uploading ? "Uploading…" : "+ Add"}
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </>
        )}
      </div>

      {error && <p style={{ color: "red", fontSize: 13, marginTop: 4 }}>{error}</p>}

      {attachments.length > 0 && (
        <div style={grid}>
          {attachments.map((att) => (
            <div key={att.id} style={card}>
              {att.is_processed && att.thumbnail_url ? (
                <img src={att.thumbnail_url} alt="" style={img} />
              ) : att.is_processed && att.file_url ? (
                <img src={att.file_url} alt="" style={img} />
              ) : (
                <div style={processing}>processing…</div>
              )}
              {!readOnly && (
                <button style={deleteBtn} onClick={() => handleDelete(att)} title="Remove">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
