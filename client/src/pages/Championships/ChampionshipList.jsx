import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { championshipService } from "../../services/championshipService";
import styles from "./Championships.module.css";
import { Trophy, Calendar, MapPin } from "lucide-react";

export const ChampionshipList = () => {
  const { token } = useAuth();
  const [championships, setChampionships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await championshipService.listAll(token);
        setChampionships(data.championships || []);
      } catch (err) {
        setError(err?.response?.data?.message || "Failed to load championships");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <h2 className={styles.title}>Championships</h2>
        <p className={styles.sub}>Discover and register for upcoming cricket tournaments.</p>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {loading ? <div className={styles.muted}>Loading…</div> : null}

      {!loading && championships.length === 0 ? (
        <div className={styles.empty}>No championships found.</div>
      ) : (
        <div className={styles.grid}>
          {championships.map((c) => (
            <Link key={c._id} to={`/championships/${c._id}`} className={`glass-card ${styles.card}`}>
              <div className={styles.cardHeader}>
                <Trophy className={styles.iconTrophy} size={24} />
                <h3 className={styles.cardTitle}>{c.name}</h3>
                <span className={`${styles.statusBadge} ${styles[c.status.toLowerCase()]}`}>
                  {c.status}
                </span>
              </div>
              <div className={styles.details}>
                <div className={styles.detailRow}>
                  <MapPin size={16} className={styles.icon} />
                  <span>{c.turfId?.name} ({c.turfId?.location})</span>
                </div>
                <div className={styles.detailRow}>
                  <Calendar size={16} className={styles.icon} />
                  <span>
                    {new Date(c.startDate).toLocaleDateString()} - {new Date(c.endDate).toLocaleDateString()}
                  </span>
                </div>
                {(c.firstPrize || c.secondPrize || c.thirdPrize) && (
                  <div className={styles.detailRow}>
                    <Trophy size={16} className={styles.icon} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                      {c.firstPrize && <span>🥇 {c.firstPrize}</span>}
                      {c.secondPrize && <span>🥈 {c.secondPrize}</span>}
                      {c.thirdPrize && <span>🥉 {c.thirdPrize}</span>}
                    </div>
                  </div>
                )}
                <div className={styles.fee}>Entry Fee: ₹{c.entryFee}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};
