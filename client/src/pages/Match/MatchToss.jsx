import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { matchService } from "../../services/matchService";
import styles from "./MatchToss.module.css";

export const MatchToss = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [match, setMatch] = useState(null);
  const { user } = useAuth();
  const [wonBy, setWonBy] = useState("A");
  const [decision, setDecision] = useState("Bat");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await matchService.get(token, id);
        if (!mounted) return;
        setMatch(data.match);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.message || "Failed to load match");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [id, token]);

  const submit = async () => {
    setError("");
    try {
      await matchService.setToss(token, id, { wonBy, decision });
      navigate(`/match/${id}/score`, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to set toss");
    }
  };

  const isCaptain = match && (String(match.teamA?.captainId) === String(user?._id || user?.id) || String(match.teamB?.captainId) === String(user?._id || user?.id));
  const isCreator = match && String(match.createdByUserId) === String(user?._id || user?.id);
  const isChampionshipOwner = match && match.championshipId && String(match.championshipId.ownerId) === String(user?._id || user?.id);
  const canDoToss = isCreator || isChampionshipOwner; // Turf owner (creator) performs the toss

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Toss</h2>
          <p className={styles.sub}>Select toss winner and decision.</p>
        </div>
      </div>
      {error ? <div className={styles.error}>{error}</div> : null}
      {loading ? <div className={styles.muted}>Loading…</div> : null}
      {match ? (
        <div className={styles.card}>
          {canDoToss ? (
            <>
              <div className={styles.row2}>
                <div className={styles.row}>
                  <div className={styles.label}>Won by</div>
                  <select className={styles.input} value={wonBy} onChange={(e) => setWonBy(e.target.value)}>
                    <option value="A">{match?.teamA?.name || "Team A"}</option>
                    <option value="B">{match?.teamB?.name || "Team B"}</option>
                  </select>
                </div>
                <div className={styles.row}>
                  <div className={styles.label}>Decision</div>
                  <select className={styles.input} value={decision} onChange={(e) => setDecision(e.target.value)}>
                    <option value="Bat">Bat</option>
                    <option value="Bowl">Bowl</option>
                  </select>
                </div>
              </div>
              <button className={styles.primary} onClick={submit}>
                Start scoring
              </button>
            </>
          ) : (
            <div className={styles.muted} style={{ textAlign: "center", padding: "20px 0" }}>
              Waiting for the Turf Owner to complete the toss...
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
};

