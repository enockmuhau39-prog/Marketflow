import Link from "next/link";

export default function Register() {
  return <main className="authPage"><div className="authCard wide">
    <div className="brand"><span className="brandMark">M</span> Marketflow</div>
    <h1>Create your business account</h1><p className="muted">Set up your workspace. You can add more details later.</p>
    <form className="form" action="/dashboard">
      <label>Business name<input name="business" placeholder="e.g. ABC Traders" required /></label>
      <label>Business type<input name="type" placeholder="e.g. Retail, Restaurant, Services" /></label>
      <label>Owner name<input name="owner" placeholder="Your full name" required /></label>
      <label>Email<input name="email" type="email" placeholder="you@business.com" required /></label>
      <label>Password<input name="password" type="password" placeholder="Create a password" required /></label>
      <button className="button" type="submit">Create account</button>
    </form>
    <p className="switch">Already registered? <Link href="/login">Log in</Link></p>
  </div></main>;
}
