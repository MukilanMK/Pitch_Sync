import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { championshipService } from "../../services/championshipService";
import styles from "./OwnerDashboard.module.css";

export const OwnerChampionships = () => {
  const { token } = useAuth();
  const [championships, setChampionships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await championshipService.listOwner(token);
      setChampionships(data.championships || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load championships");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>My Championships</div>
          {loading ? <div className={styles.muted}>Loading…</div> : null}
          <div className={styles.list}>
            {championships.map((c) => (
              <div key={c._id} className={styles.listItem}>
                <div>
                  <div className={styles.itemName}>{c.name}</div>
                  <div className={styles.itemSub}>{c.turfId?.name} • {c.status}</div>
                </div>
                <Link to={`/championships/${c._id}`} className={styles.smallPrimary}>
                  Manage
                </Link>
              </div>
            ))}
            {!loading && championships.length === 0 ? <div className={styles.muted}>No championships yet. Go to Create New.</div> : null}
          </div>
        </div>
      </div>
    </>
  );
};
