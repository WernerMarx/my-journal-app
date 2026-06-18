import apiClient from "./client";

export async function getDashboard(year, month) {
  const params = year != null && month != null ? { year, month } : {};
  const { data } = await apiClient.get("/dashboard/", { params });
  return data;
}
