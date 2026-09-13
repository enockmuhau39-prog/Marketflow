"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const nav = ["Overview", "Sales", "Leads", "Products", "Campaigns", "Expenses", "Team"];
const seedLeads = [
  { id: 1, name: "Example Customer", phone: "+260 97 000 0000", source: "Facebook", stage: "New" },
];

export default function Dashboard() {
  const [active, setActive] = useState("Overview");
  const [leads, setLeads] = useState(seedLeads);
  const [sales, setSales] = useState(0);
  const [products, setProducts] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [showSale, setShowSale] = useState(false);
  const [showLead, setShowLead] = useState(false);
  const [showProduct, setShowProduct] = useState(false);
  const [showCampaign, setShowCampaign] = useState(false);

  const pipeline = useMemo(() => ["New", "Contacted", "Qualified", "Won"].map(stage => ({ stage, count: leads.filter(l => l.stage === stage).length })), [leads]);

  function addSale(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setSales(v => v + Number(data.get("amount") || 0));
    setShowSale(false);
    e.currentTarget.reset();
  }

  function addLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setLeads(v => [...v, { id: Date.now(), name: String(data.get("name")), phone: String(data.get("phone") || ""), source: String(data.get("source") || "Other"), stage: "New" }]);
    setShowLead(false);
    e.currentTarget.reset();
  }

  return <main className="dashboard">
    <aside className="sidebar">
      <div className="brand"><span className="brandMark">M</span> Marketflow</div>
      <nav>{nav.map(item => <button key={item} className={active === item ? "active" : ""} onClick={() => setActive(item)}>{item}</button>)}</nav>
      <div className="sideBottom"><span>Starter plan</span><Link href="/">Log out</Link></div>
    </aside>

    <section className="dashContent">
      <header className="dashHeader">
        <div><div className="eyebrow">{active.toUpperCase()}</div><h1>{active === "Overview" ? "Good morning 👋" : active}</h1><p className="muted">{active === "Overview" ? "Know your business. Grow your business." : `Manage your ${active.toLowerCase()} from one place.`}</p></div>
        <div className="headerActions"><button className="secondaryButton" onClick={() => setShowLead(true)}>+ Lead</button><button className="button" onClick={() => setShowSale(true)}>+ Add sale</button></div>
      </header>

      {active === "Overview" && <>
        <div className="statGrid">
          <div className="stat"><p>Total sales</p><strong>K {sales.toLocaleString()}</strong><span>This month</span></div>
          <div className="stat"><p>New leads</p><strong>{leads.length}</strong><span>In your pipeline</span></div>
          <div className="stat"><p>Products</p><strong>{products}</strong><span>In your catalogue</span></div>
          <div className="stat"><p>Expenses</p><strong>K {expenses.toLocaleString()}</strong><span>This month</span></div>
        </div>
        <div className="panelGrid">
          <div className="panel"><div className="panelTitle"><h2>Sales performance</h2><span>Last 30 days</span></div><div className="emptyChart"><div className="bars">{[30,52,40,68,48,82,60,92,55,74,45,88].map((h,i)=><i style={{height:`${h}%`}} key={i}/>)}</div><p>Record sales to build your performance history.</p></div></div>
          <div className="panel"><div className="panelTitle"><h2>Lead pipeline</h2><span>{leads.length} leads</span></div><div className="pipeline">{pipeline.map(x=><div key={x.stage}><b>{x.count}</b><span>{x.stage}</span></div>)}</div></div>
        </div>
        <div className="panel"><div className="panelTitle"><h2>Quick start</h2></div><div className="quick"><button onClick={() => setShowProduct(true)}><b>1</b><span>Add your products</span></button><button onClick={() => setShowSale(true)}><b>2</b><span>Record your first sale</span></button><button onClick={() => setShowLead(true)}><b>3</b><span>Add a lead</span></button><button onClick={() => setShowCampaign(true)}><b>4</b><span>Create a campaign</span></button></div></div>
      </>}

      {active === "Leads" && <div className="panel"><div className="panelTitle"><h2>Customer leads</h2><button className="button small" onClick={() => setShowLead(true)}>+ Add lead</button></div><div className="tableWrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Source</th><th>Stage</th></tr></thead><tbody>{leads.map(l=><tr key={l.id}><td>{l.name}</td><td>{l.phone || "—"}</td><td>{l.source}</td><td><span className="badge">{l.stage}</span></td></tr>)}</tbody></table></div></div>}
      {active === "Sales" && <div className="panel"><div className="panelTitle"><h2>Sales</h2><button className="button small" onClick={() => setShowSale(true)}>+ Add sale</button></div><div className="bigNumber">K {sales.toLocaleString()}</div><p className="muted">Total recorded sales in this session.</p></div>}
      {active === "Products" && <div className="panel"><div className="panelTitle"><h2>Product catalogue</h2><button className="button small" onClick={() => setShowProduct(true)}>+ Add product</button></div><div className="emptyState"><strong>{products} products</strong><span>Add your products, prices and stock as the next step.</span></div></div>}
      {active === "Campaigns" && <div className="panel"><div className="panelTitle"><h2>Marketing campaigns</h2><button className="button small" onClick={() => setShowCampaign(true)}>+ Create campaign</button></div><div className="campaignGrid"><div><b>Facebook</b><span>Ready for your next campaign</span></div><div><b>Instagram</b><span>Plan visual content</span></div><div><b>TikTok</b><span>Short-form video campaigns</span></div><div><b>WhatsApp</b><span>Customer follow-up campaigns</span></div></div></div>}
      {active === "Expenses" && <div className="panel"><div className="panelTitle"><h2>Expenses</h2><button className="button small" onClick={() => setExpenses(v => v + 100)}>+ Add expense</button></div><div className="bigNumber">K {expenses.toLocaleString()}</div><p className="muted">Track business spending against sales.</p></div>}
      {active === "Team" && <div className="panel"><div className="panelTitle"><h2>Team</h2><span>Roles and activity</span></div><div className="emptyState"><strong>Owner</strong><span>Invite admins and salespeople when your team grows.</span></div></div>}
    </section>

    {showSale && <Modal title="Record a sale" close={() => setShowSale(false)}><form className="form" onSubmit={addSale}><label>Amount (ZMW)<input name="amount" type="number" min="0" placeholder="2500" required /></label><label>Customer name<input name="customer" placeholder="Customer name" /></label><button className="button" type="submit">Save sale</button></form></Modal>}
    {showLead && <Modal title="Add a lead" close={() => setShowLead(false)}><form className="form" onSubmit={addLead}><label>Name<input name="name" placeholder="Customer name" required /></label><label>Phone<input name="phone" placeholder="+260 ..." /></label><label>Source<select name="source" defaultValue="Facebook"><option>Facebook</option><option>WhatsApp</option><option>TikTok</option><option>Instagram</option><option>Website</option><option>Referral</option><option>Other</option></select></label><button className="button" type="submit">Save lead</button></form></Modal>}
    {showProduct && <Modal title="Add a product" close={() => setShowProduct(false)}><form className="form" onSubmit={e => { e.preventDefault(); setProducts(v => v + 1); setShowProduct(false); }}><label>Product name<input name="name" placeholder="Product or service" required /></label><label>Price (ZMW)<input name="price" type="number" min="0" placeholder="500" /></label><button className="button" type="submit">Add product</button></form></Modal>}
    {showCampaign && <Modal title="Create a campaign" close={() => setShowCampaign(false)}><form className="form" onSubmit={e => { e.preventDefault(); setShowCampaign(false); }}><label>Campaign name<input placeholder="Weekend promotion" required /></label><label>Platform<select defaultValue="Facebook"><option>Facebook</option><option>Instagram</option><option>TikTok</option><option>WhatsApp</option></select></label><label>Content<textarea placeholder="Write your campaign content or AI hook..." rows={5}/></label><label>Media<input type="file" accept="image/*,video/*" /></label><button className="button" type="submit">Save campaign</button></form></Modal>}
  </main>;
}

function Modal({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return <div className="modalBackdrop" onMouseDown={e => e.target === e.currentTarget && close()}><div className="modal"><div className="panelTitle"><h2>{title}</h2><button className="close" onClick={close}>×</button></div>{children}</div></div>;
}
