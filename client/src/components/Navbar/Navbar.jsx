import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import styles from "./Navbar.module.css";

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
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
            <NavLink to="/turfs" className={({ isActive }) => (isActive ? styles.active : styles.link)}>
              Browse Turfs
            </NavLink>
          ) : null}

          {isAuthenticated && user?.role === "Owner" ? (
            <NavLink to="/owner" className={({ isActive }) => (isActive ? styles.active : styles.link)}>
              Owner Dashboard
            </NavLink>
          ) : null}

          {isAuthenticated && user?.role === "Player" ? (
            <NavLink to="/player" className={({ isActive }) => (isActive ? styles.active : styles.link)}>
              Player Dashboard
            </NavLink>
          ) : null}
        </nav>

        <div className={styles.right}>
          {isAuthenticated ? (
            <>
              <div className={styles.userPill}>
                <div className={styles.userName}>{user?.name}</div>
                <div className={styles.userRole}>{user?.role}</div>
              </div>
              <button className={styles.logout} onClick={onLogout}>
                Logout
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

