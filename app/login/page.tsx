"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase/client";

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return <main className="authPage"><div className="authCard">
    <div className="brand"><span className="brandMark">M</span> Marketflow</div>
    <h1>Welcome back</h1><p className="muted">Log in to your business dashboard.</p>
    <form className="form" onSubmit={handleLogin}>
      <label>Email<input name="email" type="email" placeholder="you@business.com" required /></label>
      <label>Password<input name="password" type="password" placeholder="••••••••" required /></label>
      {error && <p className="formError">{error}</p>}
      <button className="button" type="submit" disabled={loading}>{loading ? "Logging in..." : "Log in"}</button>
    </form>
    <p className="switch">Don't have an account? <Link href="/register">Create one</Link></p>
  </div></main>;
}
