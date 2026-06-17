/** API calls for entry attachments. */

import apiClient from "./client";

export async function listAttachments(date) {
  const { data } = await apiClient.get(`/entries/${date}/attachments/`);
  return data; // array of attachment objects
}

export async function uploadAttachment(date, file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await apiClient.post(`/entries/${date}/attachments/`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteAttachment(date, id) {
  await apiClient.delete(`/entries/${date}/attachments/${id}/`);
}
