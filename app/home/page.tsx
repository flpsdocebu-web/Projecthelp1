import Link from "next/link";
import Header from "@/components/Header";
import ProtectedLink from "@/components/ProtectedLink";
import HomeLiveStats from "@/components/HomeLiveStats";
import HomeUploadedResources from "@/components/HomeUploadedResources";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <Header />
        <div className="hero-orb one" /><div className="hero-orb two" />
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">Flexible Learning, Stronger Futures</span>
            <h1>Learning support that reaches <em>every learner.</em></h1>
            <p>Discover curriculum-aligned Learning Activity Sheets created for Cebu Province teachers and students—easy to preview, download, and print.</p>
            <div className="hero-actions"><ProtectedLink className="btn primary large" href="/library/">Explore learning resources <span>→</span></ProtectedLink><Link className="text-link" href="/login/">Create a free account</Link></div>
            <div className="trust-row"><span>✓ Free access</span><span>✓ DepEd-aligned</span><span>✓ Ready to print</span></div>
          </div>
          <div className="hero-visual">
            <div className="visual-card main-card"><img src="/project-helps-logo.png" alt="Project HELPS logo" /><h2>Help Every Learner<br/>Progress & Succeed</h2><p>Learning Activity Sheets at your fingertips.</p></div>
            <HomeLiveStats location="hero"/>
            <div className="floating-stat bottom"><i>✓</i><span><b>Quality assured</b><small>By curriculum experts</small></span></div>
          </div>
        </div>
      </section>

      <HomeLiveStats location="numbers"/>

      <section className="section how">
        <div className="section-heading"><span className="eyebrow green">Simple and accessible</span><h2>Everything you need to keep learning moving</h2><p>Designed to make quality learning materials easy to find and easier to use.</p></div>
        <div className="feature-grid">
          <article><span className="feature-icon blue">⌕</span><div><small>01</small><h3>Find the right material</h3><p>Filter by grade level, learning area, quarter, and competency.</p></div></article>
          <article><span className="feature-icon green-bg">▤</span><div><small>02</small><h3>Preview before you download</h3><p>Read each PDF in a clean, engaging flipbook viewer.</p></div></article>
          <article><span className="feature-icon gold">⇩</span><div><small>03</small><h3>Download or print</h3><p>Save resources for offline use or print classroom-ready copies.</p></div></article>
        </div>
      </section>

      <section className="section featured">
        <div className="section-title-row"><div><span className="eyebrow green">Featured this week</span><h2>Learning Activity Sheets</h2></div><ProtectedLink className="text-link" href="/library/">View all resources →</ProtectedLink></div>
        <HomeUploadedResources/>
      </section>

      <section className="cta"><div><span className="eyebrow">Join the learning community</span><h2>Ready to make learning more accessible?</h2><p>Create your free account and start exploring resources today.</p></div><div><Link className="btn white large" href="/login/">Create an account →</Link><small>Already registered? <Link href="/login/">Log in here</Link></small></div></section>
      <footer><div className="brand footer-brand"><img src="/project-helps-logo.png" alt=""/><span><strong>Project HELPS</strong><small>SDO Cebu Province</small></span></div><p>Helping Every Learner Progress and Succeed.</p><span>© 2026 Department of Education • Division of Cebu Province</span></footer>
    </main>
  );
}
