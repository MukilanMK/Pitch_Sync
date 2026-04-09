import { Link } from "react-router-dom";
import styles from "./Landing.module.css";

export const Landing = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.card}>
        <div className={styles.kicker}>Modern turf booking • dual-role platform</div>
        <h1 className={styles.title}>PitchSync</h1>
        <p className={styles.sub}>
          Book cricket turfs, draft teams for gully matches, and run a live scorecard with proper extras & over math —
          all in one premium dashboard.
        </p>

        <div className={styles.actions}>
          <Link className={styles.primary} to="/turfs">
            Browse turfs
          </Link>
          <Link className={styles.secondary} to="/register">
            Create account
          </Link>
        </div>

        <div className={styles.split}>
          <div className={styles.pill}>
            <div className={styles.pillTitle}>Owner</div>
            <div className={styles.pillBody}>Post turfs and manage supply.</div>
          </div>
          <div className={styles.pill}>
            <div className={styles.pillTitle}>Player</div>
            <div className={styles.pillBody}>Book slots, draft teams, score live.</div>
          </div>
        </div>
      </div>
    </section>
  );
};

