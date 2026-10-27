export default function ProgramHomeLink() {
  return (
    <a className="program-home-link" href="/landing/index.html" aria-label="Home — choose Project HELPS or Project I-TRACK">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m3 10 9-7 9 7" />
        <path d="M5 9v11h5v-6h4v6h5V9" />
      </svg>
      <span>Home<span className="program-home-description">Program portal</span></span>
    </a>
  );
}
