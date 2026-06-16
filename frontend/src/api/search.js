/** API calls for the search / browse endpoint.
 * Mirrors the wildcard syntax documented in PLAN.md §1.3:
 *   *term*   → trigram contains
 *   term*    → FTS prefix
 *   "phrase" → FTS phrase
 *   term     → FTS websearch
 * All requests are user-scoped server-side. */

import apiClient from "./client";

/**
 * Search or browse journal entries.
 *
 * @param {object} opts
 * @param {string}  [opts.q]          - Search query (any syntax above), or omit for browse-all.
 * @param {string}  [opts.dateFrom]   - Inclusive ISO date filter (YYYY-MM-DD).
 * @param {string}  [opts.dateTo]     - Inclusive ISO date filter (YYYY-MM-DD).
 * @param {"relevance"|"date"|"title"} [opts.sort="relevance"] - Sort order.
 * @param {number}  [opts.page]       - Page number for pagination.
 * @returns {Promise<{count: number, next: string|null, previous: string|null, results: Array}>}
 */
export async function searchEntries({ q = "", dateFrom = "", dateTo = "", sort = "relevance", page } = {}) {
  const params = {};
  if (q) params.q = q;
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  if (sort) params.sort = sort;
  if (page) params.page = page;
  const { data } = await apiClient.get("/search/", { params });
  return data; // { count, next, previous, results: [{date, title, snippet, rank}] }
}
