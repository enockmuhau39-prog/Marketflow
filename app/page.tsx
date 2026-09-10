import Link from "next/link";

export default function Home() {
  return (
    <main className="landing">
      <nav className="nav">
        <div className="brand"><span className="brandMark">M</span> Marketflow</div>
        <div className="navLinks">
          <Link href="/login">Log in</Link>
          <Link className="button small" href="/register">Get started</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow">BUILT FOR BUSINESS GROWTH</div>
        <h1>Know your business.<br/><span>Grow your business.</span></h1>
        <p>Marketflow brings sales, customers, products, marketing and business performance into one simple dashboard.</p>
        <div className="heroActions">
          <Link className="button" href="/register">Start free</Link>
          <Link className="secondaryButton" href="/login">I already have an account</Link>
        </div>
        <div className="trust">Designed for small and growing businesses in Zambia.</div>
      </section>

      <section className="features">
        {[
          ["01","Sales","Track revenue, transactions and sales performance."],
          ["02","Customers & leads","Capture leads and see who needs a follow-up."],
          ["03","Marketing","Plan campaigns across Facebook, WhatsApp, TikTok and Instagram."],
          ["04","Business insights","Turn daily activity into useful numbers and charts."]
        ].map(([n,t,d]) => <div className="feature" key={n}><div className="number">{n}</div><h3>{t}</h3><p>{d}</p></div>)}
      </section>
    </main>
  );
}
