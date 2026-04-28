import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import styles from "./OwnerLayout.module.css";
import { Home, Trophy, PlusCircle } from "lucide-react";

export const OwnerLayout = () => {
  const { user } = useAuth();

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Owner Dashboard</h2>
          <p className={styles.sub}>Welcome, {user?.name}. Manage your business.</p>
        </div>
      </div>

      <div className={styles.nav}>
        <NavLink to="/owner/turfs" className={({ isActive }) => (isActive ? styles.activeTab : styles.tab)}>
          <Home size={18} />
          Turf Management
        </NavLink>
        <NavLink to="/owner/championships" className={({ isActive }) => (isActive ? styles.activeTab : styles.tab)}>
          <Trophy size={18} />
          Championships
        </NavLink>
        <NavLink to="/owner/create" className={({ isActive }) => (isActive ? styles.activeTab : styles.tab)}>
          <PlusCircle size={18} />
          Create New
        </NavLink>
      </div>

      <div className={styles.content}>
        <Outlet />
      </div>
    </section>
  );
};
