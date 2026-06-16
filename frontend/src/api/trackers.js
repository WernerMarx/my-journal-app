/** API calls for tracker definitions and per-entry tracker values.
 * All requests carry the Bearer access token via the shared apiClient
 * interceptor and are scoped server-side to the user. */

import apiClient from "./client";

/** List the user's active tracker definitions (system + custom), ordered. */
export async function listTrackers() {
  const { data } = await apiClient.get("/trackers/");
  return data; // { count, next, previous, results }
}

export async function createTracker(payload) {
  const { data } = await apiClient.post("/trackers/", payload);
  return data;
}

export async function updateTracker(id, payload) {
  const { data } = await apiClient.patch(`/trackers/${id}/`, payload);
  return data;
}

/** Soft-delete a custom tracker (system trackers are rejected with 403). */
export async function deleteTracker(id) {
  await apiClient.delete(`/trackers/${id}/`);
}

/** All active trackers for a day, each with its current value (null if unset).
 * 404 if the entry for that date does not exist yet. */
export async function getEntryTrackers(date) {
  const { data } = await apiClient.get(`/entries/${date}/trackers/`);
  return data; // [{ tracker: {...}, value }]
}

/** Replace all tracker values for a day. Payload: [{ tracker: id, value }].
 * Null values clear that tracker. Requires the entry to already exist. */
export async function setEntryTrackers(date, values) {
  const { data } = await apiClient.put(`/entries/${date}/trackers/`, values);
  return data;
}

export const DATA_TYPES = ["TEXT", "INTEGER", "FLOAT", "BOOLEAN", "OPTION"];
