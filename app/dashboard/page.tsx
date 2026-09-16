"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase/client";

const nav = ["Overview", "Sales", "Leads", "Products", "Campaigns", "Expenses", "Team", "Connect"];
const sourceMap: Record<string, string> = { Facebook: "facebook", WhatsApp: "whatsapp", TikTok: "tiktok", Instagram: "instagram", Website: "website", Referral: "referral", "Walk-in": "walk_in", Phone: "phone", Other: "other" };
const leadStatuses = ["new", "contacted", "qualified", "proposal", "won", "lost"];

export default function Dashboard() {
  const [active, setActive] = useState("Overview");
  const [user, setUser] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [role, setRole] = useState("owner");
  const [leads, setLeads] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showSale, setShowSale] = useState(false);
  const [showLead, setShowLead] = useState(false);
  const [showProduct, setShowProduct] = useState(false);
  const [showCampaign, setShowCampaign] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingLead, setUpdatingLead] = useState<string | null>(null);
  const [error, setError] = useState("");

  const pipeline = useMemo(() => ["new", "contacted", "qualified", "proposal", "won"].map(status => ({ status, count: leads.filter(l => l.status === status).length })), [leads]);
  const totalSales = sales.filter(s => s.status === "completed").reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const profit = totalSales - totalExpenses;

  async function loadData() {
    setLoading(true); setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) { window.location.href = "/login"; return; }
    setUser(authData.user);
    const { data: membership, error: memberError } = await supabase.from("business_members").select("business_id, role").eq("user_id", authData.user.id).limit(1).maybeSingle();
    if (memberError || !membership) { setError("Your account does not have a business workspace yet. Please sign out and create the account again."); setLoading(false); return; }
    setRole(membership.role || "owner");
    const businessId = membership.business_id;
    const [businessRes, leadsRes, salesRes, productsRes, expensesRes, campaignsRes, membersRes] = await Promise.all([
      supabase.from("businesses").select("id, name, business_type, plan").eq("id", businessId).single(),
      supabase.from("leads").select("id, name, phone, email, source, status, notes, created_at, assigned_to").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("sales").select("id, customer_name, customer_phone, total_amount, payment_method, status, sale_date, salesperson_id").eq("business_id", businessId).order("sale_date", { ascending: false }),
      supabase.from("products").select("id, name, sku, price, stock_quantity, active").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("expenses").select("id, category, description, amount, expense_date, created_by").eq("business_id", businessId).order("expense_date", { ascending: false }),
      supabase.from("campaigns").select("id, name, platform, objective, content, media_url, status, budget, created_at").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("business_members").select("id, user_id, role, created_at").eq("business_id", businessId).order("created_at", { ascending: true }),
    ]);
    const firstError = [businessRes, leadsRes, salesRes, productsRes, expensesRes, campaignsRes, membersRes].find(r => r.error)?.error;
    if (firstError) setError(firstError.message);
    setBusiness(businessRes.data); setLeads(leadsRes.data || []); setSales(salesRes.data || []); setProducts(productsRes.data || []); setExpenses(expensesRes.data || []); setCampaigns(campaignsRes.data || []); setMembers(membersRes.data || []); setLoading(false);
  }

  useEffect(() => { loadData(); }, []);

  async function saveSale(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!business || !user) return; setSaving(true); setError("");
    const form = new FormData(e.currentTarget);
    const productId = String(form.get("product") || "");
    const quantity = Math.max(1, Number(form.get("quantity") || 1));
    const product = products.find(p => p.id === productId);
    const typedAmount = Number(form.get("amount") || 0);
    const totalAmount = product ? Number(product.price || 0) * quantity : typedAmount;
    if (totalAmount <= 0) { setSaving(false); setError("Enter a sale amount or choose a product with a valid price."); return; }
    if (product && Number(product.stock_quantity || 0) < quantity) { setSaving(false); setError(`Not enough stock for ${product.name}. Available: ${product.stock_quantity}.`); return; }
    const { data: sale, error: saveError } = await supabase.from("sales").insert({ business_id: business.id, salesperson_id: user.id, total_amount: totalAmount, customer_name: String(form.get("customer") || "").trim() || null, customer_phone: String(form.get("phone") || "").trim() || null, payment_method: String(form.get("payment") || "Cash"), status: "completed", sale_date: new Date().toISOString() }).select("id").single();
    if (saveError || !sale) { setSaving(false); setError(saveError?.message || "Could not save the sale."); return; }
    if (product) {
      const { error: itemError } = await supabase.from("sale_items").insert({ sale_id: sale.id, product_id: product.id, product_name: product.name, quantity, unit_price: Number(product.price || 0) });
      if (itemError) { setSaving(false); setError(`Sale saved, but the product line could not be recorded: ${itemError.message}`); await loadData(); return; }
      const { error: stockError } = await supabase.from("products").update({ stock_quantity: Number(product.stock_quantity || 0) - quantity }).eq("id", product.id).eq("business_id", business.id);
      if (stockError) setError(`Sale saved, but stock was not updated: ${stockError.message}`);
    }
    setSaving(false); setShowSale(false); e.currentTarget.reset(); await loadData();
  }

  async function saveLead(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!business) return; setSaving(true); setError(""); const form = new FormData(e.currentTarget);
    const { error: saveError } = await supabase.from("leads").insert({ business_id: business.id, name: String(form.get("name") || "").trim(), phone: String(form.get("phone") || "").trim() || null, email: String(form.get("email") || "").trim() || null, source: sourceMap[String(form.get("source") || "Other")] || "other", status: "new", notes: String(form.get("notes") || "").trim() || null });
    setSaving(false); if (saveError) return setError(saveError.message); setShowLead(false); e.currentTarget.reset(); await loadData();
  }

  async function updateLeadStatus(id: string, status: string) {
    if (!business) return; setUpdatingLead(id); setError("");
    const { error: updateError } = await supabase.from("leads").update({ status }).eq("id", id).eq("business_id", business.id);
    setUpdatingLead(null); if (updateError) return setError(updateError.message); setLeads(current => current.map(lead => lead.id === id ? { ...lead, status } : lead));
  }

  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!business) return; setSaving(true); setError(""); const form = new FormData(e.currentTarget);
    const { error: saveError } = await supabase.from("products").insert({ business_id: business.id, name: String(form.get("name") || "").trim(), price: Number(form.get("price") || 0), cost_price: Number(form.get("cost") || 0), stock_quantity: Number(form.get("stock") || 0), sku: String(form.get("sku") || "").trim() || null, active: true });
    setSaving(false); if (saveError) return setError(saveError.message); setShowProduct(false); e.currentTarget.reset(); await loadData();
  }

  async function saveCampaign(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!business || !user) return; setSaving(true); setError(""); const form = new FormData(e.currentTarget); const file = form.get("media") as File | null; let mediaUrl: string | null = null;
    if (file && file.size > 0) {
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-"); const filePath = `${business.id}/${crypto.randomUUID()}-${cleanName}`;
      const { error: uploadError } = await supabase.storage.from("campaign-media").upload(filePath, file, { cacheControl: "3600", upsert: false, contentType: file.type || undefined });
      if (uploadError) { setSaving(false); setError(`Media upload failed: ${uploadError.message}`); return; }
      mediaUrl = supabase.storage.from("campaign-media").getPublicUrl(filePath).data.publicUrl;
    }
    const { error: saveError } = await supabase.from("campaigns").insert({ business_id: business.id, created_by: user.id, name: String(form.get("name") || "").trim(), platform: String(form.get("platform") || "facebook").toLowerCase(), objective: String(form.get("objective") || "Lead generation"), content: String(form.get("content") || ""), media_url: mediaUrl, budget: Number(form.get("budget") || 0), status: "draft" });
    setSaving(false); if (saveError) return setError(mediaUrl ? `Campaign could not be saved after media upload: ${saveError.message}` : saveError.message); setShowCampaign(false); e.currentTarget.reset(); await loadData();
  }

  async function saveExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!business || !user) return; setSaving(true); setError(""); const form = new FormData(e.currentTarget);
    const { error: saveError } = await supabase.from("expenses").insert({ business_id: business.id, category: String(form.get("category") || "General"), description: String(form.get("description") || "").trim() || null, amount: Number(form.get("amount") || 0), created_by: user.id, expense_date: String(form.get("date") || new Date().toISOString().slice(0, 10)) });
    setSaving(false); if (saveError) return setError(saveError.message); setShowExpense(false); e.currentTarget.reset(); await loadData();
  }

  async function logout() { await supabase.auth.signOut(); window.location.href = "/"; }
  if (loading) return <main className="loadingPage"><div><span className="brandMark">M</span><h2>Loading Marketflow...</h2><p className="muted">Connecting to your business workspace.</p></div></main>;

  return <main className="dashboard">
    <aside className="sidebar"><div className="brand"><span className="brandMark">M</span> Marketflow</div><nav>{nav.map(item => <button key={item} className={active === item ? "active" : ""} onClick={() => setActive(item)}>{item}</button>)}</nav><div className="sideBottom"><span>{business?.plan || "Starter"} plan · {role}</span><button className="logoutButton" onClick={logout}>Log out</button></div></aside>
    <section className="dashContent">
      <header className="dashHeader"><div><div className="eyebrow">{active.toUpperCase()}</div><h1>{active === "Overview" ? `Good morning, ${user?.user_metadata?.full_name?.split(" ")[0] || "there"} 👋` : active}</h1><p className="muted">{business?.name || "Your business"} · {business?.business_type || "Business workspace"}</p></div><div className="headerActions"><button className="secondaryButton" onClick={() => setShowLead(true)}>+ Lead</button><button className="button" onClick={() => setShowSale(true)}>+ Add sale</button></div></header>
      {error && <div className="notice errorNotice">{error}<button onClick={() => setError("")}>×</button></div>}

      {active === "Overview" && <><div className="statGrid"><div className="stat"><p>Total sales</p><strong>K {totalSales.toLocaleString()}</strong><span>Recorded revenue</span></div><div className="stat"><p>New leads</p><strong>{leads.filter(l => l.status === "new").length}</strong><span>{leads.length} total leads</span></div><div className="stat"><p>Products</p><strong>{products.length}</strong><span>In your catalogue</span></div><div className="stat"><p>Net position</p><strong>K {profit.toLocaleString()}</strong><span>Sales less recorded expenses</span></div></div><div className="panelGrid"><div className="panel"><div className="panelTitle"><h2>Sales snapshot</h2><span>{sales.length} sales</span></div><div className="emptyChart"><div className="bars">{[30,52,40,68,48,82,60,92,55,74,45,88].map((h,i)=><i style={{height:`${h}%`}} key={i}/>)}</div><p>Your revenue records are now connected to Supabase.</p></div></div><div className="panel"><div className="panelTitle"><h2>Lead pipeline</h2><span>{leads.length} leads</span></div><div className="pipeline">{pipeline.map(x=><div key={x.status}><b>{x.count}</b><span>{x.status[0].toUpperCase()+x.status.slice(1)}</span></div>)}</div></div></div><div className="panel"><div className="panelTitle"><h2>Quick start</h2><span>Build your growth engine</span></div><div className="quick"><button onClick={() => setShowProduct(true)}><b>1</b><span>Add a product</span></button><button onClick={() => setShowSale(true)}><b>2</b><span>Record a sale</span></button><button onClick={() => setShowLead(true)}><b>3</b><span>Add a lead</span></button><button onClick={() => setShowCampaign(true)}><b>4</b><span>Create a campaign</span></button></div></div></>}

      {active === "Leads" && <div className="panel"><div className="panelTitle"><div><h2>Customer leads</h2><span>{leads.length} contacts in your pipeline</span></div><button className="button small" onClick={() => setShowLead(true)}>+ Add lead</button></div><div className="tableWrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Source</th><th>Status</th><th>Added</th></tr></thead><tbody>{leads.length===0?<tr><td colSpan={5} className="emptyCell">No leads yet.</td></tr>:leads.map(l=><tr key={l.id}><td><strong>{l.name}</strong><small>{l.email||""}</small></td><td>{l.phone||"—"}</td><td>{String(l.source||"other").replace("_"," ")}</td><td><select value={l.status} disabled={updatingLead===l.id} onChange={e=>updateLeadStatus(l.id,e.target.value)}>{leadStatuses.map(s=><option key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}</select></td><td>{l.created_at?new Date(l.created_at).toLocaleDateString():"—"}</td></tr>)}</tbody></table></div></div>}

      {active === "Sales" && <div className="panel"><div className="panelTitle"><div><h2>Sales</h2><span>K {totalSales.toLocaleString()} completed revenue</span></div><button className="button small" onClick={() => setShowSale(true)}>+ Add sale</button></div><div className="tableWrap"><table><thead><tr><th>Date</th><th>Customer</th><th>Payment</th><th>Status</th><th>Amount</th></tr></thead><tbody>{sales.length===0?<tr><td colSpan={5} className="emptyCell">No sales recorded yet.</td></tr>:sales.map(s=><tr key={s.id}><td>{s.sale_date?new Date(s.sale_date).toLocaleDateString():"—"}</td><td>{s.customer_name||"Walk-in customer"}</td><td>{s.payment_method||"—"}</td><td><span className="badge">{s.status}</span></td><td><strong>K {Number(s.total_amount||0).toLocaleString()}</strong></td></tr>)}</tbody></table></div></div>}

      {active === "Products" && <div className="panel"><div className="panelTitle"><div><h2>Product catalogue</h2><span>{products.length} products</span></div><button className="button small" onClick={() => setShowProduct(true)}>+ Add product</button></div><div className="tableWrap"><table><thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead><tbody>{products.length===0?<tr><td colSpan={5} className="emptyCell">No products yet.</td></tr>:products.map(p=><tr key={p.id}><td><strong>{p.name}</strong></td><td>{p.sku||"—"}</td><td>K {Number(p.price||0).toLocaleString()}</td><td>{p.stock_quantity}</td><td><span className="badge">{p.active?"active":"inactive"}</span></td></tr>)}</tbody></table></div></div>}

      {active === "Campaigns" && <div className="panel"><div className="panelTitle"><div><h2>Marketing campaigns</h2><span>Create, store and manage your campaign assets</span></div><button className="button small" onClick={() => setShowCampaign(true)}>+ Create campaign</button></div><div className="campaignGrid">{campaigns.length===0?<div className="emptyState"><strong>No campaigns yet</strong><span>Create your first campaign and start building your marketing engine.</span></div>:campaigns.map(c=><div key={c.id}><b>{c.name}</b><span>{c.platform} · {c.status}{c.budget?` · K ${Number(c.budget).toLocaleString()}`:""}</span><p>{c.content||"No campaign content yet."}</p>{c.media_url&&<a href={c.media_url} target="_blank" rel="noreferrer">View campaign media ↗</a>}</div>)}</div></div>}

      {active === "Expenses" && <div className="panel"><div className="panelTitle"><div><h2>Expenses</h2><span>K {totalExpenses.toLocaleString()} recorded spending</span></div><button className="button small" onClick={() => setShowExpense(true)}>+ Add expense</button></div><div className="tableWrap"><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead><tbody>{expenses.length===0?<tr><td colSpan={4} className="emptyCell">No expenses recorded yet.</td></tr>:expenses.map(e=><tr key={e.id}><td>{e.expense_date||"—"}</td><td>{e.category}</td><td>{e.description||"—"}</td><td><strong>K {Number(e.amount||0).toLocaleString()}</strong></td></tr>)}</tbody></table></div></div>}

      {active === "Team" && <div className="panel"><div className="panelTitle"><div><h2>Team</h2><span>{members.length} current member{members.length===1?"":"s"}</span></div></div><div className="tableWrap"><table><thead><tr><th>Member</th><th>Role</th><th>Joined</th></tr></thead><tbody>{members.map(m=><tr key={m.id}><td>{m.user_id===user?.id?"You":m.user_id}</td><td><span className="badge">{m.role}</span></td><td>{m.created_at?new Date(m.created_at).toLocaleDateString():"—"}</td></tr>)}</tbody></table></div><div className="emptyState"><strong>Next team layer</strong><span>Invitations, salesperson attribution and activity tracking will sit on top of these business memberships.</span></div></div>}

      {active === "Connect" && <div className="panel"><div className="panelTitle"><div><h2>Connect your lead sources</h2><span>Marketflow is ready for the integration layer</span></div></div><div className="campaignGrid"><div><b>Facebook</b><span>Lead source</span><p>Connect Facebook lead forms so new prospects can flow into Marketflow automatically.</p><button className="secondaryButton" disabled>Connection setup next</button></div><div><b>Instagram</b><span>Lead source</span><p>Bring Instagram enquiries into the same lead pipeline and track their source.</p><button className="secondaryButton" disabled>Connection setup next</button></div><div><b>WhatsApp</b><span>Lead source</span><p>Keep WhatsApp prospects tied to their lead record and customer history.</p><button className="secondaryButton" disabled>Connection setup next</button></div><div><b>Webhook</b><span>Automation</span><p>External forms and lead tools can post lead data into a Marketflow endpoint in the next integration stage.</p><button className="secondaryButton" disabled>Webhook setup next</button></div></div></div>}
    </section>

    {showSale && <Modal title="Record a sale" close={() => setShowSale(false)}><form className="form" onSubmit={saveSale}><label>Product (optional)<select name="product" defaultValue=""><option value="">No product — enter amount manually</option>{products.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.name} · K {Number(p.price||0).toLocaleString()} · stock {p.stock_quantity}</option>)}</select></label><div className="formRow"><label>Quantity<input name="quantity" type="number" min="1" defaultValue="1" /></label><label>Amount (ZMW)<input name="amount" type="number" min="0" placeholder="2500" /></label></div><label>Customer name<input name="customer" placeholder="Customer name" /></label><label>Customer phone<input name="phone" placeholder="+260 ..." /></label><label>Payment method<select name="payment" defaultValue="Cash"><option>Cash</option><option>Mobile Money</option><option>Bank</option><option>Card</option><option>Credit</option></select></label><button className="button" type="submit" disabled={saving}>{saving?"Saving...":"Save sale"}</button></form></Modal>}
    {showLead && <Modal title="Add a lead" close={() => setShowLead(false)}><form className="form" onSubmit={saveLead}><label>Name<input name="name" placeholder="Customer name" required /></label><label>Phone<input name="phone" placeholder="+260 ..." /></label><label>Email<input name="email" type="email" placeholder="customer@email.com" /></label><label>Source<select name="source" defaultValue="Facebook">{Object.keys(sourceMap).map(s=><option key={s}>{s}</option>)}</select></label><label>Notes<textarea name="notes" rows={3} placeholder="What does this lead need?" /></label><button className="button" type="submit" disabled={saving}>{saving?"Saving...":"Save lead"}</button></form></Modal>}
    {showProduct && <Modal title="Add a product" close={() => setShowProduct(false)}><form className="form" onSubmit={saveProduct}><label>Product name<input name="name" placeholder="Product or service" required /></label><label>SKU<input name="sku" placeholder="Optional SKU" /></label><div className="formRow"><label>Price (ZMW)<input name="price" type="number" min="0" placeholder="500" required /></label><label>Cost (ZMW)<input name="cost" type="number" min="0" placeholder="300" /></label></div><label>Stock quantity<input name="stock" type="number" min="0" placeholder="10" required /></label><button className="button" type="submit" disabled={saving}>{saving?"Saving...":"Add product"}</button></form></Modal>}
    {showCampaign && <Modal title="Create a campaign" close={() => setShowCampaign(false)}><form className="form" onSubmit={saveCampaign}><label>Campaign name<input name="name" placeholder="Weekend promotion" required /></label><div className="formRow"><label>Platform<select name="platform" defaultValue="facebook"><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="whatsapp">WhatsApp</option><option value="website">Website</option></select></label><label>Budget (ZMW)<input name="budget" type="number" min="0" placeholder="1000" /></label></div><label>Objective<select name="objective" defaultValue="Lead generation"><option>Lead generation</option><option>Sales</option><option>Brand awareness</option><option>Engagement</option></select></label><label>Content<textarea name="content" placeholder="Write your campaign content or AI hook..." rows={5} /></label><label>Media<input name="media" type="file" accept="image/*,video/*" /></label><p className="muted">Images and videos are stored in Marketflow's campaign media bucket.</p><button className="button" type="submit" disabled={saving}>{saving?"Uploading...":"Save campaign"}</button></form></Modal>}
    {showExpense && <Modal title="Add an expense" close={() => setShowExpense(false)}><form className="form" onSubmit={saveExpense}><label>Category<select name="category" defaultValue="General"><option>General</option><option>Marketing</option><option>Transport</option><option>Stock</option><option>Rent</option><option>Salaries</option><option>Utilities</option></select></label><label>Description<input name="description" placeholder="What was the money spent on?" /></label><div className="formRow"><label>Amount (ZMW)<input name="amount" type="number" min="0" placeholder="300" required /></label><label>Date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} /></label></div><button className="button" type="submit" disabled={saving}>{saving?"Saving...":"Save expense"}</button></form></Modal>}
  </main>;
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return <div className="modalBackdrop" onMouseDown={e => e.target === e.currentTarget && close()}><div className="modal"><div className="panelTitle"><h2>{title}</h2><button className="close" type="button" onClick={close}>×</button></div>{children}</div></div>;
}
