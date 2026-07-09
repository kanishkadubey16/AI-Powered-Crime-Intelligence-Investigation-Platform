import api from "./api";

export const authService = {
  login: (credentials) => api.post("/auth/login", credentials),
  signup: (data) => api.post("/auth/register", data),
  getMe: () => api.get("/auth/me"),
  updateProfile: (data) => api.put("/auth/profile", data),
  changePassword: (data) => api.put("/auth/change-password", data),
};
