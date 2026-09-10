import Link from "next/link";

const cards = [
  ["Total sales","K 0","This month"],
  ["New leads","0","This month"],
  ["Products","0","In your catalogue"],
  ["Expenses","K 0","This month"]
];

export default function Dashboard() {
  return <main className="dashboard">
    <aside className="sidebar">
      <div className="brand"><span className="brandMark">M</span> Marketflow</div>
      <nav>
        {["Overview","Sales","Leads","Products","Campaigns","Expenses","Team"].map((x,i)=><Link className={i===0?"active":""} href="/dashboard" key={x}>{x}</Link>)}
      </nav>
      <div className="sideBottom"><span>Starter plan</span><Link href="/">Log out</Link></div>
    </aside>
    <section className="dashContent">
      <header className="dashHeader"><div><div className="eyebrow">OVERVIEW</div><h1>Good morning 👋</h1><p className="muted">Here is what is happening with your business.</p></div><button className="button">+ Add sale</button></header>
      <div className="statGrid">{cards.map(([a,b,c])=><div className="stat" key={a}><p>{a}</p><strong>{b}</strong><span>{c}</span></div>)}</div>
      <div className="panelGrid">
        <div className="panel"><div className="panelTitle"><h2>Sales performance</h2><span>Last 30 days</span></div><div className="emptyChart"><div className="bars">{[30,52,40,68,48,82,60,92,55,74,45,88].map((h,i)=><i style={{height:`${h}%`}} key={i}/>)}</div><p>Your sales chart will appear here as you record sales.</p></div></div>
        <div className="panel"><div className="panelTitle"><h2>Lead pipeline</h2><span>0 leads</span></div><div className="pipeline">{["New","Contacted","Qualified","Won"].map(x=><div key={x}><b>0</b><span>{x}</span></div>)}</div></div>
      </div>
      <div className="panel"><div className="panelTitle"><h2>Quick start</h2></div><div className="quick"><div><b>1</b><span>Add your products</span></div><div><b>2</b><span>Record your first sale</span></div><div><b>3</b><span>Add a lead</span></div><div><b>4</b><span>Create a campaign</span></div></div></div>
    </section>
  </main>;
}
