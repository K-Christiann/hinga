import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Bell,
  ClipboardList,
  Check,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  NotebookPen,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { Pagination } from "./components/Pagination";
import { usePagination } from "./hooks/pagination";
import { useApp } from "./context";
import { useMemberNotifications } from "./hooks/notifications";
import { notificationPresentation } from "../application/notifications";
import {
  Button,
  EmptyState,
  FlowerMark,
  Logo,
  Modal,
  ErrorLine,
} from "./components/Primitives";
import {
  AuthDialog,
  Onboarding,
  PrivacyDialog,
} from "./components/AccountDialogs";
import { SettingsDialog } from "./components/SettingsDialog";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { Community } from "./pages/Community";
import { Notes } from "./pages/Notes";
import { Help, Resources } from "./pages/Help";
import { ReviewDesk } from "./pages/ReviewDesk";
import { Activity } from "./pages/Activity";
import { StaffAccessProvider, useStaffAccess } from "./moderation/StaffAccess";

function PublicHeader({
  onLogin,
  onPrivacy,
}: {
  onLogin(): void;
  onPrivacy(): void;
}) {
  const { identity } = useApp();
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => setMenu(false), [location.pathname]);
  return (
    <header className="public-header">
      <Link to="/" aria-label="Hinga home">
        <Logo />
      </Link>
      <nav className="desktop-public-nav" aria-label="Main navigation">
        <Link to="/" aria-current={location.pathname === "/" ? "page" : undefined}>Your space</Link>
        <Link to="/resources" aria-current={location.pathname === "/resources" ? "page" : undefined}>A little understanding</Link>
        <button onClick={onPrivacy}>Privacy & choices</button>
      </nav>
      <div className="public-header-actions">
        <Link to="/help" className="header-help" aria-current={location.pathname === "/help" ? "page" : undefined}>
          <HeartHandshake size={16} /> Get Help
        </Link>
        {identity ? (
          <Link to="/dashboard" className="button button-secondary">
            My space <ArrowRight size={15} />
          </Link>
        ) : (
          <Button tone="secondary" onClick={onLogin}>
            Come on in <ArrowRight size={15} />
          </Button>
        )}
        <button
          className="icon-button mobile-menu-toggle"
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {menu && (
        <nav className="public-mobile-menu">
          <Link to="/" aria-current={location.pathname === "/" ? "page" : undefined}>Your space</Link>
          <Link to="/resources" aria-current={location.pathname === "/resources" ? "page" : undefined}>Resources</Link>
          <button
            onClick={() => {
              setMenu(false);
              onPrivacy();
            }}
          >
            Privacy & choices
          </button>
          <Link to="/help" aria-current={location.pathname === "/help" ? "page" : undefined}>Get Help</Link>
        </nav>
      )}
    </header>
  );
}
function Shell({ onSettings }: { onSettings(): void }) {
  const staff = useStaffAccess();
  const { identity, profile, loading, services, dirty, setDirty, act } =
    useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { data: notifications, error: notificationError } = useMemberNotifications(notificationsOpen);
  const unread = notifications.filter((item) => !item.read).length;
  const notificationPage = usePagination(notifications, 6, `${identity?.id}:${notificationsOpen}`);
  const routes = [
    {
      path: "/dashboard",
      label: "Dashboard",
      short: "Home",
      icon: LayoutDashboard,
    },
    {
      path: "/thoughts",
      label: "Speak your thoughts",
      short: "Thoughts",
      icon: MessageCircle,
    },
    { path: "/notes", label: "My Notes", short: "Notes", icon: NotebookPen },
    { path: "/activity", label: "My activity", short: "Activity", icon: ClipboardList },
  ];
  if (staff.access?.role) routes.push({ path: "/review", label: "Review desk", short: "Review", icon: ShieldCheck });
  const go = (path: string) => navigate(path);
  if (!identity && !loading) return <Navigate to="/" replace />;
  const activeLabel =
    routes.find((route) => route.path === location.pathname)?.label ||
    "Your space";
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button
          className="sidebar-brand"
          onClick={() => go("/")}
          aria-label="Hinga home"
        >
          <Logo />
        </button>
        <div className="sidebar-nav-label">YOUR PERSONAL SPACE</div>
        <nav aria-label="Your space">
          {routes.map((route) => (
            <button
              key={route.path}
              title={route.label}
              aria-current={location.pathname === route.path ? "page" : undefined}
              className={`side-nav-item ${location.pathname === route.path ? "active" : ""}`}
              onClick={() => go(route.path)}
            >
              <route.icon size={19} />
              <span className="nav-full-label">{route.label}</span>
              <span className="nav-short-label">{route.short}</span>
              {location.pathname === route.path && (
                <span className="active-nav-dot" />
              )}
            </button>
          ))}
          <button
            className="side-nav-item mobile-help-item"
            onClick={() => go("/help")}
          >
            <HeartHandshake size={20} />
            <span>Get Help</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-support">
            <FlowerMark size={29} />
            <h3>
              You don’t have to
              <br />
              do it all alone.
            </h3>
            <p>
              A little support can be
              <br />a place to start.
            </p>
            <button className="text-link" onClick={() => go("/help")}>
              Find support <ArrowRight size={14} />
            </button>
          </div>
          <button
            className="side-nav-item"
            onClick={onSettings}
            title="Settings"
          >
            <Settings2 size={18} />
            <span>Settings & privacy</span>
          </button>
          <button
            className="side-nav-item signout-item"
            title="Sign out"
            onClick={async () => {
              if (
                dirty &&
                !window.confirm("Sign out and leave your unsaved changes?")
              )
                return;
              await act(() => services.auth.signOut());
            }}
          >
            <LogOut size={18} />
            <span>
              Sign out
            </span>
          </button>
          <span className="sidebar-small-print">
            A little space. At your pace.
          </span>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-topbar">
          <div className="topbar-breadcrumb">
            <span>Your space</span>
            <span>/</span>
            <strong>{activeLabel}</strong>
          </div>
          <Link to="/" className="mobile-app-logo" aria-label="Hinga home">
            <Logo />
          </Link>
          <div className="topbar-actions">
            <span className="today-date">
              {new Date().toLocaleDateString("en", {
                weekday: "short",
                month: "short",
                day: "numeric",
                timeZone: profile?.timezone || "Asia/Manila",
              })}
            </span>
            <button
              className="icon-button notification-bell"
              aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell size={20} />
              {unread > 0 && <span className="notification-dot" />}
            </button>
            <button
              className="account-avatar"
              onClick={onSettings}
              aria-label="Open your settings"
            >
              {profile?.alias
                ?.split(" ")
                .map((word) => word[0])
                .slice(0, 2)
                .join("") || "H"}
            </button>
          </div>
        </header>

        <main className="app-main" id="main-content">
          {loading || !profile ? (
            <div className="loading-space">
              <FlowerMark size={42} />
              <p>Making a little room for you…</p>
              {!loading && (
                <Button
                  tone="secondary"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </Button>
              )}
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      <Modal
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        title="A little connection."
        eyebrow="YOUR NOTIFICATIONS"
      >
        <ErrorLine>{notificationError}</ErrorLine>
        {notifications.length ? (
          <div className="notifications-list" id="notifications-list">
            {notificationPage.items.map((item) => (
              <button
                key={item.id}
                className={`notification-item ${item.read ? "" : "unread"}`}
                onClick={async () => {
                  await act(() =>
                    services.notifications.markRead(identity!.id, item.id),
                  );
                  setNotificationsOpen(false);
                  go(notificationPresentation(item).path);
                }}
              >
                <span className="notification-icon">
                  <MessageCircle size={20} />
                </span>
                <span>
                  <strong>{notificationPresentation(item).label}</strong>
                  <small>
                    {new Date(item.createdAt).toLocaleDateString("en", {
                      month: "short",
                      day: "numeric",
                    })}
                  </small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
            <Pagination {...notificationPage} label="Notifications" controls="notifications-list" onChange={notificationPage.setPage} />
          </div>
        ) : (
          <EmptyState icon={<Bell size={27} />} title="A quiet moment.">
            Replies, moderation decisions, and updates on your concerns or appeals appear here.
          </EmptyState>
        )}
      </Modal>
    </div>
  );
}
function StatusToast() {
  const { toast, error, clearToast } = useApp();
  return toast || error ? (
    <div
      className={`toast ${error ? "toast-error" : ""}`}
      role={error ? "alert" : "status"}
    >
      <span>
        {error ? <span aria-hidden="true">!</span> : <Check size={18} />}
      </span>
      <p>{error || toast}</p>
      <button aria-label="Dismiss message" onClick={clearToast}>
        <X size={16} />
      </button>
    </div>
  ) : null;
}
export function App() {
  const { identity, profile, dirty } = useApp();
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const location = useLocation();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const privacy = () => setPrivacyOpen(true);
  const login = () => (identity ? navigate("/dashboard") : setAuthOpen(true));
  useEffect(() => {
    if (identity && location.pathname === "/") {
      setAuthOpen(false);
      navigate("/dashboard");
    }
  }, [identity?.id]);
  useEffect(() => {
    const pageTitles: Record<string, string> = {
      "/": "A little space for you",
      "/dashboard": "Your space",
      "/thoughts": "Shared thoughts",
      "/notes": "My Notes",
      "/review": "Review desk",
      "/activity": "My activity",
      "/help": "Get Help",
      "/resources": "Resources",
    };
    document.title = `Hinga — ${pageTitles[location.pathname] || "Your space"}`;
    window.scrollTo({ top: 0, behavior: "instant" });
    const main = document.getElementById("main-content");
    main?.setAttribute("tabindex", "-1"); main?.focus({ preventScroll: true });
  }, [location.pathname]);
  const publicPage = (children: ReactNode) => (
    <>
      <PublicHeader onLogin={login} onPrivacy={privacy} />
      {children}
    </>
  );
  return (
    <>
      <a href="#main-content" className="skip-link" onClick={(event) => {
        event.preventDefault();
        const main = document.getElementById("main-content");
        main?.setAttribute("tabindex", "-1");
        main?.focus(); main?.scrollIntoView({ block: "start" });
      }}>
        Skip to content
      </a>
      <Routes>
        <Route
          path="/"
          element={<Landing onLogin={login} onPrivacy={privacy} />}
        />
        <Route path="/resources" element={publicPage(<Resources />)} />
        <Route path="/help" element={publicPage(<Help />)} />
        <Route element={<StaffAccessProvider><Shell onSettings={() => setSettingsOpen(true)} /></StaffAccessProvider>}>
          <Route
            path="/dashboard"
            element={<Dashboard onSettings={() => setSettingsOpen(true)} />}
          />
          <Route path="/thoughts" element={<Community />} />
          <Route path="/review" element={<ReviewDesk />} />
          <Route path="/activity" element={<Activity />} />
          <Route
            path="/notes"
            element={<Notes onSettings={() => setSettingsOpen(true)} />}
          />
        </Route>
        <Route
          path="*"
          element={publicPage(
            <main className="not-found" id="main-content" tabIndex={-1}>
              <FlowerMark size={60} />
              <h1>A little detour.</h1>
              <p>
                This page isn’t here, but your space and support options still
                are.
              </p>
              <Link className="button button-primary" to="/">
                Back to Hinga <ArrowRight size={17} />
              </Link>
              <Link className="text-link" to="/help">
                Open Get Help
              </Link>
            </main>,
          )}
        />
      </Routes>
      <AuthDialog
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onPrivacy={privacy}
      />
      <PrivacyDialog open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      {identity && profile && (
        <SettingsDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onPrivacy={privacy}
        />
      )}{" "}
      {identity &&
        profile &&
        !profile.onboardingComplete &&
        !["/help", "/resources"].includes(location.pathname) && (
          <Onboarding onPrivacy={privacy} />
        )}
      <StatusToast />
    </>
  );
}
