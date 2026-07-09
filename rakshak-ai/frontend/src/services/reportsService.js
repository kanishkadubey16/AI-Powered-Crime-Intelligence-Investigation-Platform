import api from "./api";

export const reportsService = {
  getAll: () => api.get("/reports"),
  getById: (id) => api.get(`/reports/${id}`),
  generate: (data) => api.post("/reports/generate", data),
  download: (id) => api.get(`/reports/${id}/download`, { responseType: "blob" }),
};
