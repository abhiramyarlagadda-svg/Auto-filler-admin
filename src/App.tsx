// ── App router + auth gate ─────────────────────────────────────────────
// Routes:
//   /login     — Supabase Auth email+password sign-in
//   /questions — protected: admin dashboard for managing the question library
//   /          — redirects to /questions

import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import Login from "./pages/Login";
import Questions from "./pages/Questions";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    // Subscribe to auth state changes (login / logout)
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <p><span className="spinner" />Checking session…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to="/questions" replace /> : <Login />} />
      <Route path="/questions" element={session ? <Layout session={session} /> : <Navigate to="/login" replace />} />
      <Route path="/" element={<Navigate to={session ? "/questions" : "/login"} replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ── Layout wrapper for authenticated pages ─────────────────────────────
function Layout({ session }: { session: Session }) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <>
      <header className="header">
        <h1><span className="icon">⚡</span> Galaxy Auto-Filler — Admin</h1>
        <div className="user-info">
          <span>{session.user.email}</span>
          <button className="btn-secondary" onClick={handleLogout}>Log out</button>
        </div>
      </header>
      <Questions />
    </>
  );
}
