import api from "./api";

export const casesService = {
  getAll: (params) => api.get("/cases", { params }),
  getById: (id) => api.get(`/cases/${id}`),
  create: (data) => api.post("/cases", data),
  update: (id, data) => api.put(`/cases/${id}`, data),
  delete: (id) => api.delete(`/cases/${id}`),
  uploadFIR: (formData) =>
    api.post("/cases/upload-fir", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};
