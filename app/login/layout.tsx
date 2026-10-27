import ProgramHomeLink from "@/components/ProgramHomeLink";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="login-page-with-home">
      <nav className="login-home-navigation" aria-label="Program navigation"><ProgramHomeLink /></nav>
      {children}
    </div>
  );
}
