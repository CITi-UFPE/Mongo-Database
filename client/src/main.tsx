import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, useAuth } from "./context/AuthContext";
import App from "./App";
import GoogleAuth from "./GoogleAuth";
import { canAccessAnalytics, isPendingAccess } from "./types/auth";
import OnboardingForm from "./pages/Auth/OnboardingForm";
import PendingApproval from "./pages/Auth/PendingApproval";
import AdminApprovalPanel from "./pages/Auth/AdminApprovalPanel";
import "./index.css";

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
const HAS_GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID.length > 0;

const LoginRouteElement = HAS_GOOGLE_CLIENT_ID ? (
  <GoogleAuth />
) : (
  <div style={{ padding: "1rem", textAlign: "center" }}>
    Login indisponivel temporariamente: configure VITE_GOOGLE_CLIENT_ID no frontend.
  </div>
);

if (!GOOGLE_CLIENT_ID) {
  throw new Error(
    "VITE_GOOGLE_CLIENT_ID nao configurado. Defina a variavel no ambiente de build do frontend."
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  if (user?.onboarding_required || user?.status === "Nao Cadastrado") {
    return <Navigate to="/onboarding" replace />;
  }

  

  return <>{children}</>;
}

function AdminAnalyticsRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  if (user?.onboarding_required || user?.status === "Nao Cadastrado") {
    return <Navigate to="/onboarding" replace />;
  }

  if (isPendingAccess(user)) {
    return <Navigate to="/pending" replace />;
  }

  
  return <>{children}</>;
}

function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  if (!user?.onboarding_required && user?.status !== "Nao Cadastrado") {
    // Se não precisa de onboarding, vai direto pros gráficos!
    return <Navigate to="/analytics" replace />; 
  }

  return <>{children}</>;
}

function PendingRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  if (user?.onboarding_required || user?.status === "Nao Cadastrado") {
    return <Navigate to="/onboarding" replace />;
  }

  if (!isPendingAccess(user)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

function AdminApprovalRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  const isAdmin = Boolean(user?.is_admin && user?.acesso_aprovado && user?.status === "Aprovado");
  if (!isAdmin) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

const appTree = (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/" element={LoginRouteElement} />
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <App defaultViewMode="planilha" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <AdminAnalyticsRoute>
              <App defaultViewMode="dashboard" />
            </AdminAnalyticsRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <OnboardingRoute>
              <OnboardingForm />
            </OnboardingRoute>
          }
        />
        <Route
          path="/pending"
          element={
            <PendingRoute>
              <PendingApproval />
            </PendingRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminApprovalRoute>
              <AdminApprovalPanel />
            </AdminApprovalRoute>
          }
        />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

createRoot(root).render(
  <React.StrictMode>
    {HAS_GOOGLE_CLIENT_ID ? (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{appTree}</GoogleOAuthProvider>
    ) : (
      appTree
    )}
  </React.StrictMode>
);
