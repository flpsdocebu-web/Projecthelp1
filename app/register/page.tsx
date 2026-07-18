import Link from "next/link";

export default function Register() {
  return (
    <main className="auth-page">
      <section className="auth-art register-art">
        <Link className="brand" href="/home/"><img src="/project-helps-logo.png" alt="Project HELPS"/><span><strong>Project HELPS</strong><small>SDO Cebu Province</small></span></Link>
        <div><span className="eyebrow">Join Project HELPS</span><h1>One account. A world of learning.</h1><p>Connect with resources built to help every Cebuano learner succeed.</p></div>
        <div className="benefits"><span>✓ Free access to learning resources</span><span>✓ Preview, download, and print anytime</span><span>✓ Secure role-based accounts</span></div>
      </section>
      <section className="auth-form"><div>
        <h2>Create your account</h2><p>Select the account type that applies to you.</p>
        <form>
          <div className="role-picker three">
            <label><input type="radio" name="role" defaultChecked/><span>♙<strong>Student</strong><small>Access learning sheets</small></span></label>
            <label><input type="radio" name="role"/><span>▣<strong>School User</strong><small>Teachers and staff</small></span></label>
            <label><input type="radio" name="role"/><span>♜<strong>Administrator</strong><small>Authorized users only</small></span></label>
          </div>
          <div className="two-cols"><label>First name<input placeholder="Juan"/></label><label>Last name<input placeholder="Dela Cruz"/></label></div>
          <label>School or district<input placeholder="Select or enter your school"/></label>
          <label>Email address<input type="email" placeholder="you@example.com"/></label>
          <label>Password<input type="password" placeholder="At least 8 characters"/></label>
          <label>Administrator authorization code <small className="field-help">Required only for administrator registration</small><input type="password" placeholder="Enter authorization code, if applicable"/></label>
          <Link className="btn primary full" href="/library">Create my account →</Link>
        </form>
        <p className="security-note">Administrator accounts must be approved by the Project HELPS system owner before receiving dashboard access.</p>
        <p className="form-foot">Already registered? <Link href="/login">Log in</Link></p>
        <Link className="back" href="/login">← Back to login</Link>
      </div></section>
    </main>
  );
}
