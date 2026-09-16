"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase/client";

const FUNCTION_NAME = "marketflow-lead-webhook";

export default function ConnectPage() {
  const [business, setBusiness] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [endpoint, setEndpoint] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [testData, setTestData] = useState({ name: "Test lead", phone: "+260970000000", email: "test@example.com" });

  const webhookUrl = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base || !endpoint?.token) return "";
    return `${base}/functions/v1/${FUNCTION_NAME}?token=${encodeURIComponent(endpoint.token)}`;
  }, [endpoint]);

  async function load() {
    setLoading(true);
    setError("");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      window.location.href = "/login";
      return;
    }
    setUser(auth.user);
    const { data: membership, error: membershipError } = await supabase
      .from("business_members")
      .select("business_id, role")
      .eq("user_id", auth.user.id)
      .limit(1)
      .maybeSingle();
    if (membershipError || !membership) {
      setError(membershipError?.message || "Business workspace not found.");
      setLoading(false);
      return;
    }
    const [businessRes, endpointRes] = await Promise.all([
      supabase.from("businesses").select("id, name, business_type, plan").eq("id", membership.business_id).single(),
      supabase.from("webhook_endpoints").select("id, name, token, active, created_at").eq("business_id", membership.business_id).limit(1).maybeSingle(),
    ]);
    if (businessRes.error) setError(businessRes.error.message);
    if (endpointRes.error) setError(endpointRes.error.message);
    setBusiness(businessRes.data);
    setEndpoint(endpointRes.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function copyUrl() {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function sendTest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!webhookUrl) return;
    setTesting(true);
    setTestResult("");
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-source": "website" },
        body: JSON.stringify({
          name: testData.name,
          phone: testData.phone,
          email: testData.email,
          source: "website",
          notes: "Created by Market Flow Connect test",
          external_id: `connect-test-${Date.now()}`,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Webhook test failed");
      setTestResult(`Success — lead ${data.lead_id || "was received"}. Open Leads to see it.`);
    } catch (err) {
      setTestResult(err instanceof Error ? err.message : "Webhook test failed.");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return <main className="loadingPage"><div><span className="brandMark">M</span><h2>Loading Connect...</h2><p className="muted">Preparing your lead intake tools.</p></div></main>;
  }

  return (
    <main className="dashboard">
      <aside className="sidebar">
        <div className="brand"><span className="brandMark">M</span> Marketflow</div>
        <nav>
          <Link className="active" href="/dashboard">Overview</Link>
          <Link href="/dashboard">Sales</Link>
          <Link href="/dashboard">Leads</Link>
          <Link href="/dashboard">Products</Link>
          <Link href="/dashboard">Campaigns</Link>
          <Link href="/dashboard">Expenses</Link>
          <Link href="/dashboard">Team</Link>
          <Link className="active" href="/dashboard/connect">Connect</Link>
        </nav>
        <div className="sideBottom"><span>{business?.plan || "Starter"} plan</span><Link className="logoutButton" href="/dashboard">Back to dashboard</Link></div>
      </aside>

      <section className="dashContent">
        <header className="dashHeader">
          <div>
            <div className="eyebrow">CONNECT</div>
            <h1>Bring your leads into Market Flow</h1>
            <p className="muted">Use the webhook below with forms, automation tools, websites or other lead sources.</p>
          </div>
        </header>

        {error && <div className="notice errorNotice">{error}</div>}

        <div className="panelGrid">
          <div className="panel">
            <div className="panelTitle"><div><h2>Lead webhook</h2><span>{business?.name || "Your business"}</span></div><span className="badge">{endpoint?.active ? "Ready" : "Inactive"}</span></div>
            <p className="muted">Send a POST request with JSON containing name, phone, email and source. Market Flow will create a new lead automatically.</p>
            <label className="formField">Webhook URL<input readOnly value={webhookUrl} /></label>
            <div className="headerActions"><button className="button" onClick={copyUrl}>{copied ? "Copied" : "Copy webhook URL"}</button><Link className="secondaryButton" href="/dashboard">Back to dashboard</Link></div>
          </div>

          <div className="panel">
            <div className="panelTitle"><div><h2>What can connect?</h2><span>One intake layer for many sources</span></div></div>
            <div className="pipeline">
              <div><b>01</b><span>Website forms</span></div>
              <div><b>02</b><span>Facebook / Instagram automations</span></div>
              <div><b>03</b><span>WhatsApp workflows</span></div>
              <div><b>04</b><span>Zapier / Make / n8n</span></div>
              <div><b>05</b><span>Custom apps and scripts</span></div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panelTitle"><div><h2>Test the connection</h2><span>This creates a real lead in your CRM</span></div></div>
          <form className="form" onSubmit={sendTest}>
            <label>Name<input value={testData.name} onChange={e => setTestData({ ...testData, name: e.target.value })} required /></label>
            <label>Phone<input value={testData.phone} onChange={e => setTestData({ ...testData, phone: e.target.value })} /></label>
            <label>Email<input type="email" value={testData.email} onChange={e => setTestData({ ...testData, email: e.target.value })} /></label>
            <button className="button" type="submit" disabled={testing || !webhookUrl}>{testing ? "Sending..." : "Send test lead"}</button>
          </form>
          {testResult && <div className="notice">{testResult}</div>}
        </div>

        <div className="panel">
          <div className="panelTitle"><div><h2>Expected payload</h2><span>Simple JSON structure for integrations</span></div></div>
          <pre className="codeBlock">{JSON.stringify({ name: "Jane Doe", phone: "+26097...", email: "jane@example.com", source: "facebook", notes: "Interested in this offer" }, null, 2)}</pre>
          <p className="muted">Market Flow currently maps the common fields automatically and puts the new contact into the <strong>New</strong> stage.</p>
        </div>
      </section>
    </main>
  );
}
