import api from "./api";

export const analyticsService = {
  getSummary: () => api.get("/analytics/summary"),
};
