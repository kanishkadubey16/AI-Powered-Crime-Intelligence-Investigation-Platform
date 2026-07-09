export const APP_NAME = "Rakshak AI";

export const ROUTES = {
  LOGIN: "/login",
  SIGNUP: "/signup",
  DASHBOARD: "/",
  CASES: "/cases",
  CASE_DETAILS: "/cases/:id",
  UPLOAD_FIR: "/upload-fir",
  EVIDENCE: "/evidence",
  ANALYTICS: "/analytics",
  AI_ASSISTANT: "/ai-assistant",
  REPORTS: "/reports",
  SETTINGS: "/settings",
};

export const CASE_STATUS = {
  OPEN: "open",
  CLOSED: "closed",
  PENDING: "pending",
  UNDER_INVESTIGATION: "under_investigation",
};

export const CASE_PRIORITY = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
};

export const STATUS_COLORS = {
  open: "text-emerald-400 bg-emerald-400/10",
  closed: "text-slate-400 bg-slate-400/10",
  pending: "text-amber-400 bg-amber-400/10",
  under_investigation: "text-cyan-400 bg-cyan-400/10",
};

export const PRIORITY_COLORS = {
  low: "text-slate-400 bg-slate-400/10",
  medium: "text-amber-400 bg-amber-400/10",
  high: "text-orange-400 bg-orange-400/10",
  critical: "text-red-400 bg-red-400/10",
};
