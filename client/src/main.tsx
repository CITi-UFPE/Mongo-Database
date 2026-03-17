import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, useAuth } from "./context/AuthContext";
import App from "./App";
import GoogleAuth from "./GoogleAuth";
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
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
          path="/analytics"
          element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
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
