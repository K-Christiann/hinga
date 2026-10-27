import { useRef, useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
export function LandingHeader({
  onLogin,
  onPrivacy,
}: {
  onLogin(): void;
  onPrivacy(): void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const scrollToTools = () => {
    setMenuOpen(false);
    const heading = document.getElementById("lp-tools-heading");
    heading?.scrollIntoView({ block: "start" });
    heading?.focus({ preventScroll: true });
  };
  return (
    <header
      className="lp-header lp-width"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menuOpen) {
          setMenuOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <Link
        to="/"
        className="lp-wordmark"
        aria-label="Hinga home"
        onClick={() => setMenuOpen(false)}
      >
        hinga<span>.</span>
      </Link>
      <nav className="lp-desktop-nav" aria-label="Main navigation">
        <button onClick={scrollToTools}>The space</button>
        <Link to="/resources">A little understanding</Link>
        <button onClick={onPrivacy}>Your privacy</button>
      </nav>
      <div className="lp-header-actions">
        <Link to="/help" className="lp-help-link">
          Get Help <ArrowUpRight size={16} />
        </Link>
        <button className="lp-signin" onClick={onLogin}>
          Continue with Google <ArrowUpRight size={16} />
        </button>
        <button
          ref={menuButton}
          className="lp-menu-button"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="lp-mobile-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      <nav
        className="lp-mobile-nav"
        id="lp-mobile-navigation"
        aria-label="Mobile navigation"
        hidden={!menuOpen}
        onKeyDown={(event) => {
          if (event.key === "Escape") setMenuOpen(false);
        }}
      >
        <button onClick={scrollToTools}>
          Explore the space <ArrowUpRight size={17} />
        </button>
        <Link to="/resources" onClick={() => setMenuOpen(false)}>
          Resources <ArrowUpRight size={17} />
        </Link>
        <button
          onClick={() => {
            setMenuOpen(false);
            onPrivacy();
          }}
        >
          Your privacy <ArrowUpRight size={17} />
        </button>
        <button
          onClick={() => {
            setMenuOpen(false);
            onLogin();
          }}
        >
          Continue with Google <ArrowUpRight size={17} />
        </button>
      </nav>
    </header>
  );
}
