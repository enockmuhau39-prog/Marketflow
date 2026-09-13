"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase/client";

const nav = ["Overview", "Sales", "Leads", "Products", "Campaigns", "Expenses", "Team"];
const sourceMap: Record<string, string> = {
  Facebook: "facebook",
  WhatsApp: "whatsapp",
  TikTok: "tiktok",
  Instagram: "instagram",
  Website: "website",
  Referral: "referral",
  "Walk-in": "walk_in",
  Phone: "phone",
  Other: "other",
};

export default function Dashboard() {
  const [active, setActive] = useState("Overview");
  const [user, setUser] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showSale, setShowSale] = useState(false);
  const [showLead, setShowLead] = useState(false);
  const [showProduct, setShowProduct] = useState(false);
  const [showCampaign, setShowCampaign] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pipeline = useMemo(() => ["new", "contacted", "qualified", "won"].map(status => ({
    status,
    count: leads.filter(l => l.status === status).length,
  })), [leads]);

  const totalSales = sales.filter(s => s.status === "completed").reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  async function loadData() {
    setLoading(true);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      window.location.href = "/login";
      return;
    }

    setUser(authData.user);

    const { data: membership, error: memberError } = await supabase
      .from("business_members")
      .select("business_id, role")
      .eq("user_id", authData.user.id)
      .limit(1)
      .maybeSingle();

    if (memberError || !membership) {
      setError("Your account does not have a business workspace yet. Please sign out and create the account again.");
      setLoading(false);
      return;
    }

    const businessId = membership.business_id;
    const [businessRes, leadsRes, salesRes, productsRes, expensesRes, campaignsRes] = await Promise.all([
      supabase.from("businesses").select("id, name, business_type, plan").eq("id", businessId).single(),
      supabase.from("leads").select("id, name, phone, email, source, status, notes, created_at").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("sales").select("id, customer_name, total_amount, payment_method, status, sale_date").eq("business_id", businessId).order("sale_date", { ascending: false }),
      supabase.from("products").select("id, name, price, stock_quantity, active").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("expenses").select("id, category, description, amount, expense_date").eq("business_id", businessId).order("expense_date", { ascending: false }),
      supabase.from("campaigns").select("id, name, platform, content, status, created_at").eq("business_id", businessId).order("created_at", { ascending: false }),
    ]);

    const firstError = [businessRes, leadsRes, salesRes, productsRes, expensesRes, campaignsRes].find(r => r.error)?.error;
    if (firstError) setError(firstError.message);

    setBusiness(businessRes.data);
    setLeads(leadsRes.data || []);
    setSales(salesRes.data || []);
    setProducts(productsRes.data || []);
    setExpenses(expensesRes.data || []);
    setCampaigns(campaignsRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function saveSale(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!business) return;
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const { error: saveError } = await supabase.from("sales").insert({
      business_id: business.id,
      total_amount: Number(form.get("amount") || 0),
      customer_name: String(form.get("customer") || "").trim() || null,
      payment_method: String(form.get("payment") || "Cash"),
      status: "completed",
      sale_date: new Date().toISOString(),
    });
    setSaving(false);
    if (saveError) return setError(saveError.message);
    setShowSale(false);
    e.currentTarget.reset();
    await loadData();
  }

  async function saveLead(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!business) return;
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const { error: saveError } = await supabase.from("leads").insert({
      business_id: business.id,
      name: String(form.get("name") || "").trim(),
      phone: String(form.get("phone") || "").trim() || null,
      email: String(form.get("email") || "").trim() || null,
      source: sourceMap[String(form.get("source") || "Other")] || "other",
      status: "new",
    });
    setSaving(false);
    if (saveError) return setError(saveError.message);
    setShowLead(false);
    e.currentTarget.reset();
    await loadData();
  }

  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!business) return;
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const { error: saveError } = await supabase.from("products").insert({
      business_id: business.id,
      name: String(form.get("name") || "").trim(),
      price: Number(form.get("price") || 0),
      stock_quantity: Number(form.get("stock") || 0),
      active: true,
    });
    setSaving(false);
    if (saveError) return setError(saveError.message);
    setShowProduct(false);
    e.currentTarget.reset();
    await loadData();
  }

  async function saveCampaign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!business || !user) return;
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const file = form.get("media") as File | null;
    let mediaUrl: string | null = null;

    // Media persistence is the next Storage step; the campaign itself is saved now.
    if (file && file.size > 0) mediaUrl = file.name;

    const { error: saveError } = await supabase.from("campaigns").insert({
      business_id: business.id,
      created_by: user.id,
      name: String(form.get("name") || "").trim(),
      platform: String(form.get("platform") || "facebook").toLowerCase(),
      objective: String(form.get("objective") || "Lead generation"),
      content: String(form.get("content") || ""),
      media_url: mediaUrl,
      status: "draft",
    });
    setSaving(false);
    if (saveError) return setError(saveError.message);
    setShowCampaign(false);
    e.currentTarget.reset();
    await loadData();
  }

  async function saveExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!business || !user) return;
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const { error: saveError } = await supabase.from("expenses").insert({
      business_id: business.id,
      category: String(form.get("category") || "General"),
      description: String(form.get("description") || "").trim() || null,
      amount: Number(form.get("amount") || 0),
      created_by: user.id,
      expense_date: new Date().toISOString().slice(0, 10),
    });
    setSaving(false);
    if (saveError) return setError(saveError.message);
    setShowExpense(false);
    e.currentTarget.reset();
    await loadData();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (loading) return <main className="loadingPage"><div><span className="brandMark">M</span><h2>Loading Marketflow...</h2><p className="muted">Connecting to your business workspace.</p></div></main>;

  return <main className="dashboard">
    <aside className="sidebar">
      <div className="brand"><span className="brandMark">M</span> Marketflow</div>
      <nav>{nav.map(item => <button key={item} className={active === item ? "active" : ""} onClick={() => setActive(item)}>{item}</button>)}</nav>
      <div className="sideBottom"><span>{business?.plan || "Starter"} plan</span><button className="logoutButton" onClick={logout}>Log out</button></div>
    </aside>

    <section className="dashContent">
      <header className="dashHeader">
        <div><div className="eyebrow">{active.toUpperCase()}</div><h1>{active === "Overview" ? `Good morning, ${user?.user_metadata?.full_name?.split(" ")[0] || "there"} 👋` : active}</h1><p className="muted">{business?.name || "Your business"} · {business?.business_type || "Business workspace"}</p></div>
        <div className="headerActions"><button className="secondaryButton" onClick={() => setShowLead(true)}>+ Lead</button><button className="button" onClick={() => setShowSale(true)}>+ Add sale</button></div>
      </header>

      {error && <div className="notice errorNotice">{error}<button onClick={() => setError("")}>×</button></div>}

      {active === "Overview" && <>
        <div className="statGrid">
          <div className="stat"><p>Total sales</p><strong>K {totalSales.toLocaleString()}</strong><span>Recorded revenue</span></div>
          <div className="stat"><p>New leads</p><strong>{leads.filter(l => l.status === "new").length}</strong><span>{leads.length} total leads</span></div>
          <div className="stat"><p>Products</p><strong>{products.length}</strong><span>In your catalogue</span></div>
          <div className="stat"><p>Expenses</p><strong>K {totalExpenses.toLocaleString()}</strong><span>Recorded spending</span></div>
        </div>
        <div className="panelGrid">
          <div className="panel"><div className="panelTitle"><h2>Sales performance</h2><span>{sales.length} sales</span></div><div className="emptyChart"><div className="bars">{[30,52,40,68,48,82,60,92,55,74,45,88].map((h,i)=><i style={{height:`${h}%`}} key={i}/>)}</div><p>Your sales history is now connected to Supabase.</p></div></div>
          <div className="panel"><div className="panelTitle"><h2>Lead pipeline</h2><span>{leads.length} leads</span></div><div className="pipeline">{pipeline.map(x=><div key={x.status}><b>{x.count}</b><span>{x.status[0].toUpperCase()+x.status.slice(1)}</span></div>)}</div></div>
        </div>
        <div className="panel"><div className="panelTitle"><h2>Quick start</h2></div><div className="quick"><button onClick={() => setShowProduct(true)}><b>1</b><span>Add a product</span></button><button onClick={() => setShowSale(true)}><b>2</b><span>Record a sale</span></button><button onClick={() => setShowLead(true)}><b>3</b><span>Add a lead</span></button><button onClick={() => setShowCampaign(true)}><b>4</b><span>Create a campaign</span></button></div></div>
      </>}

      {active === "Leads" && <div className="panel"><div className="panelTitle"><h2>Customer leads</h2><button className="button small" onClick={() => setShowLead(true)}>+ Add lead</button></div><div className="tableWrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Source</th><th>Status</th></tr></thead><tbody>{leads.length === 0 ? <tr><td colSpan={4} className="emptyCell">No leads yet.</td></tr> : leads.map(l=><tr key={l.id}><td>{l.name}</td><td>{l.phone || "—"}</td><td>{l.source.replace("_", " ")}</td><td><span className="badge">{l.status}</span></td></tr>)}</tbody></table></div></div>}
      {active === "Sales" && <div className="panel"><div className="panelTitle"><h2>Sales</h2><button className="button small" onClick={() => setShowSale(true)}>+ Add sale</button></div><div className="bigNumber">K {totalSales.toLocaleString()}</div><p className="muted">Sales are stored in your Marketflow database.</p></div>}
      {active === "Products" && <div className="panel"><div className="panelTitle"><h2>Product catalogue</h2><button className="button small" onClick={() => setShowProduct(true)}>+ Add product</button></div><div className="tableWrap"><table><thead><tr><th>Product</th><th>Price</th><th>Stock</th></tr></thead><tbody>{products.length === 0 ? <tr><td colSpan={3} className="emptyCell">No products yet.</td></tr> : products.map(p=><tr key={p.id}><td>{p.name}</td><td>K {Number(p.price || 0).toLocaleString()}</td><td>{p.stock_quantity}</td></tr>)}</tbody></table></div></div>}
      {active === "Campaigns" && <div className="panel"><div className="panelTitle"><h2>Marketing campaigns</h2><button className="button small" onClick={() => setShowCampaign(true)}>+ Create campaign</button></div><div className="campaignGrid">{campaigns.length === 0 ? <div className="emptyState"><strong>No campaigns yet</strong><span>Create your first campaign and start building your marketing engine.</span></div> : campaigns.map(c=><div key={c.id}><b>{c.name}</b><span>{c.platform} · {c.status}</span><p>{c.content || "No campaign content yet."}</p></div>)}</div></div>}
      {active === "Expenses" && <div className="panel"><div className="panelTitle"><h2>Expenses</h2><button className="button small" onClick={() => setShowExpense(true)}>+ Add expense</button></div><div className="bigNumber">K {totalExpenses.toLocaleString()}</div><p className="muted">Track business spending against sales.</p></div>}
      {active === "Team" && <div className="panel"><div className="panelTitle"><h2>Team</h2><span>Business roles</span></div><div className="emptyState"><strong>Owner</strong><span>Your team-management system is connected to business memberships. Invitations and salesperson activity are the next team layer.</span></div></div>}
    </section>

    {showSale && <Modal title="Record a sale" close={() => setShowSale(false)}><form className="form" onSubmit={saveSale}><label>Amount (ZMW)<input name="amount" type="number" min="0" placeholder="2500" required /></label><label>Customer name<input name="customer" placeholder="Customer name" /></label><label>Payment method<select name="payment" defaultValue="Cash"><option>Cash</option><option>Mobile Money</option><option>Bank</option><option>Card</option><option>Credit</option></select></label><button className="button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save sale"}</button></form></Modal>}
    {showLead && <Modal title="Add a lead" close={() => setShowLead(false)}><form className="form" onSubmit={saveLead}><label>Name<input name="name" placeholder="Customer name" required /></label><label>Phone<input name="phone" placeholder="+260 ..." /></label><label>Email<input name="email" type="email" placeholder="customer@email.com" /></label><label>Source<select name="source" defaultValue="Facebook">{Object.keys(sourceMap).map(s => <option key={s}>{s}</option>)}</select></label><button className="button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save lead"}</button></form></Modal>}
    {showProduct && <Modal title="Add a product" close={() => setShowProduct(false)}><form className="form" onSubmit={saveProduct}><label>Product name<input name="name" placeholder="Product or service" required /></label><label>Price (ZMW)<input name="price" type="number" min="0" placeholder="500" /></label><label>Stock quantity<input name="stock" type="number" min="0" placeholder="10" /></label><button className="button" type="submit" disabled={saving}>{saving ? "Saving..." : "Add product"}</button></form></Modal>}
    {showCampaign && <Modal title="Create a campaign" close={() => setShowCampaign(false)}><form className="form" onSubmit={saveCampaign}><label>Campaign name<input name="name" placeholder="Weekend promotion" required /></label><label>Platform<select name="platform" defaultValue="facebook"><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="whatsapp">WhatsApp</option><option value="website">Website</option></select></label><label>Objective<select name="objective" defaultValue="Lead generation"><option>Lead generation</option><option>Sales</option><option>Brand awareness</option><option>Engagement</option></select></label><label>Content<textarea name="content" placeholder="Write your campaign content or AI hook..." rows={5}/></label><label>Media<input name="media" type="file" accept="image/*,video/*" /></label><button className="button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save campaign"}</button></form></Modal>}
    {showExpense && <Modal title="Add an expense" close={() => setShowExpense(false)}><form className="form" onSubmit={saveExpense}><label>Category<select name="category" defaultValue="General"><option>General</option><option>Marketing</option><option>Transport</option><option>Stock</option><option>Rent</option><option>Salaries</option><option>Utilities</option></select></label><label>Description<input name="description" placeholder="What was the money spent on?" /></label><label>Amount (ZMW)<input name="amount" type="number" min="0" placeholder="300" required /></label><button className="button" type="submit" disabled={saving}>{saving ? "Saving..." : "Save expense"}</button></form></Modal>}
  </main>;
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return <div className="modalBackdrop" onMouseDown={e => e.target === e.currentTarget && close()}><div className="modal"><div className="panelTitle"><h2>{title}</h2><button className="close" type="button" onClick={close}>×</button></div>{children}</div></div>;
}
