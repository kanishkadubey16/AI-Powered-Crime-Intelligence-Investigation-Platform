import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../layout/MainLayout";
import AuthLayout from "../layout/AuthLayout";

import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Dashboard from "../pages/Dashboard";
import Cases from "../pages/Cases";
import CaseDetails from "../pages/CaseDetails";
import UploadFIR from "../pages/UploadFIR";
import Evidence from "../pages/Evidence";
import Analytics from "../pages/Analytics";
import AIAssistant from "../pages/AIAssistant";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import NotFound from "../pages/NotFound";

const AppRoutes = () => (
  <Routes>
    {/* Auth routes */}
    <Route element={<AuthLayout />}>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
    </Route>

    {/* Protected routes */}
    <Route element={<ProtectedRoute />}>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:id" element={<CaseDetails />} />
        <Route path="/upload-fir" element={<UploadFIR />} />
        <Route path="/evidence" element={<Evidence />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/ai-assistant" element={<AIAssistant />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default AppRoutes;
