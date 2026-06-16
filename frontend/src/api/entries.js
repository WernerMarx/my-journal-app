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
