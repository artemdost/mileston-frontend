import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Web3Provider } from "./context/Web3Context";
import { LangProvider, useLang } from "./context/LangContext";
import { ThemeProvider } from "./context/ThemeContext";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import ProjectDetail from "./pages/ProjectDetail";
import CreateProject from "./pages/CreateProject";
import Dashboard from "./pages/Dashboard";
import VotingPage from "./pages/VotingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import Kyc from "./pages/Kyc";

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "60vh"
      }}>
        <span className="loading-spin" style={{ width: 28, height: 28, borderWidth: 3 }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;

  return children;
}

function Footer() {
  const { lang } = useLang();
  return (
    <footer style={{
      borderTop: "1px solid var(--hair)",
      padding: "20px 32px",
      marginTop: "auto",
      background: "var(--bg)"
    }}>
      <div style={{
        maxWidth: 1280, margin: "0 auto",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        fontSize: 12, color: "var(--ink-4)",
        fontFamily: "var(--font-mono)",
        textTransform: "uppercase", letterSpacing: "0.04em"
      }}>
        <span>© 2026 Mileston · {lang === "ru" ? "VKR Prototype" : "Thesis Prototype"}</span>
        <span>{lang === "ru" ? "На базе Ethereum" : "Powered by Ethereum"}</span>
      </div>
    </footer>
  );
}

function AppContent() {
  return (
    <div className="app">
      <Navbar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/project/:id" element={<ProjectDetail />} />
          <Route path="/create" element={<ProtectedRoute role="author"><CreateProject /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute role="author"><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/kyc" element={<ProtectedRoute><Kyc /></ProtectedRoute>} />
          <Route path="/voting/:projectId/:milestoneIndex" element={<VotingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "var(--ink)",
            color: "var(--bg)",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            borderRadius: 6,
            padding: "10px 14px",
          },
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <Web3Provider>
            <AppContent />
          </Web3Provider>
        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  );
}
