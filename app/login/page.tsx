import Link from "next/link";

export default function Login() {
  return <main className="authPage"><div className="authCard">
    <div className="brand"><span className="brandMark">M</span> Marketflow</div>
    <h1>Welcome back</h1><p className="muted">Log in to your business dashboard.</p>
    <form className="form" action="/dashboard">
      <label>Email<input type="email" placeholder="you@business.com" required /></label>
      <label>Password<input type="password" placeholder="••••••••" required /></label>
      <button className="button" type="submit">Log in</button>
    </form>
    <p className="switch">Don't have an account? <Link href="/register">Create one</Link></p>
  </div></main>;
}
