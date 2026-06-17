/** API calls for journal entries. All requests carry the Bearer access token
 * via the shared apiClient interceptor and are scoped server-side to the user. */

import apiClient from "./client";

export async function listEntries(params = {}) {
  const { data } = await apiClient.get("/entries/", { params });
  return data; // { count, next, previous, results }
}

export async function getEntry(date) {
  const { data } = await apiClient.get(`/entries/${date}/`);
  return data;
}

export async function createEntry(payload) {
  const { data } = await apiClient.post("/entries/", payload);
  return data;
}

export async function updateEntry(date, payload) {
  const { data } = await apiClient.patch(`/entries/${date}/`, payload);
  return data;
}

/** Today's date as YYYY-MM-DD in the browser's local timezone. */
export function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Shift a YYYY-MM-DD date string by `delta` calendar days, returning YYYY-MM-DD.
 * Parsed at local midday so DST shifts can't tip the result onto an adjacent day. */
export function addDays(iso, delta) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return todayISOFrom(d);
}

function todayISOFrom(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
