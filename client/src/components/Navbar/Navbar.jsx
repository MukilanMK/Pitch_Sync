import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { useTheme } from "../../contexts/useTheme";
import { Home, LayoutDashboard, LogOut, Moon, Sun } from "lucide-react";
import styles from "./Navbar.module.css";

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <header className={styles.wrap}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMark} />
          <span>PitchSync</span>
        </Link>

        <nav className={styles.nav}>
          {!isAuthenticated || user?.role !== "Owner" ? (
            <NavLink to="/turfs" className={({ isActive }) => (isActive ? styles.active : styles.link)} title="Browse Turfs">
              <Home size={20} className={styles.icon} />
              <span className={styles.navText}>Turfs</span>
            </NavLink>
          ) : null}

          {isAuthenticated && user?.role === "Owner" ? (
            <NavLink to="/owner" className={({ isActive }) => (isActive ? styles.active : styles.link)} title="Owner Dashboard">
              <LayoutDashboard size={20} className={styles.icon} />
              <span className={styles.navText}>Dashboard</span>
            </NavLink>
          ) : null}

          {isAuthenticated && user?.role === "Player" ? (
            <NavLink to="/player" className={({ isActive }) => (isActive ? styles.active : styles.link)} title="Player Dashboard">
              <LayoutDashboard size={20} className={styles.icon} />
              <span className={styles.navText}>Dashboard</span>
            </NavLink>
          ) : null}
        </nav>

        <div className={styles.right}>
          <button onClick={toggleTheme} className={styles.themeToggle} title="Toggle Theme">
            {theme === "night" ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          {isAuthenticated ? (
            <>
              <div className={styles.userPill}>
                <div className={styles.userName}>{user?.name} {user?.userId ? `(@${user.userId})` : ""}</div>
                <div className={styles.userRole}>{user?.role}</div>
              </div>
              <button className={styles.logout} onClick={onLogout} title="Logout">
                <LogOut size={20} className={styles.iconOnlyMobile} />
                <span className={styles.logoutText}>Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link className={styles.linkBtn} to="/login">
                Login
              </Link>
              <Link className={styles.primaryBtn} to="/register">
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

