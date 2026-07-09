import api from "./api";

export const evidenceService = {
  getAll: (caseId) => api.get(`/evidence`, { params: { caseId } }),
  getById: (id) => api.get(`/evidence/${id}`),
  upload: (formData) =>
    api.post("/evidence/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  delete: (id) => api.delete(`/evidence/${id}`),
  analyze: (id) => api.post(`/evidence/${id}/analyze`),
};
