"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { supabase } from "../../lib/supabase/client";

export default function Register() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const business = String(form.get("business") || "").trim();
    const type = String(form.get("type") || "").trim();
    const owner = String(form.get("owner") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          business_name: business,
          business_type: type,
          full_name: owner,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      window.location.href = "/dashboard";
      return;
    }

    setMessage("Account created. Check your email to confirm your account, then log in.");
    setLoading(false);
  }

  return <main className="authPage"><div className="authCard wide">
    <div className="brand"><span className="brandMark">M</span> Marketflow</div>
    <h1>Create your business account</h1><p className="muted">Set up your workspace. You can add more details later.</p>
    <form className="form" onSubmit={handleRegister}>
      <label>Business name<input name="business" placeholder="e.g. ABC Traders" required /></label>
      <label>Business type<input name="type" placeholder="e.g. Retail, Restaurant, Services" /></label>
      <label>Owner name<input name="owner" placeholder="Your full name" required /></label>
      <label>Email<input name="email" type="email" placeholder="you@business.com" required /></label>
      <label>Password<input name="password" type="password" placeholder="Create a password" minLength={6} required /></label>
      {error && <p className="formError">{error}</p>}
      {message && <p className="formSuccess">{message}</p>}
      <button className="button" type="submit" disabled={loading}>{loading ? "Creating account..." : "Create account"}</button>
    </form>
    <p className="switch">Already registered? <Link href="/login">Log in</Link></p>
  </div></main>;
}
