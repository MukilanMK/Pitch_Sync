import { Outlet } from "react-router-dom";
import { Navbar } from "../components/Navbar/Navbar";
import styles from "./AppLayout.module.css";

export const AppLayout = () => {
  return (
    <div className={styles.shell}>
      <Navbar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
};

