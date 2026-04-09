import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { matchService } from "../../services/matchService";
import styles from "./MatchScore.module.css";

const WICKET_KINDS = ["Bowled", "Caught", "LBW", "RunOut", "Stumped", "HitWicket", "ObstructingField", "HandledBall", "TimedOut", "RetiredHurt", "RetiredOut"];

const legalOverBall = (legalDeliveries) => {
  const o = Math.floor(legalDeliveries / 6);
  const b = legalDeliveries % 6;
  return `${o}.${b}`;
};

export const MatchScore = () => {
  const { id } = useParams();
  const { token } = useAuth();
  const [match, setMatch] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [inningsIndex, setInningsIndex] = useState(0);
  const [strikerId, setStrikerId] = useState("");
  const [nonStrikerId, setNonStrikerId] = useState("");
  const [bowlerId, setBowlerId] = useState("");

  const [wicketFlow, setWicketFlow] = useState(false);
  const [wicketKind, setWicketKind] = useState("Bowled");
  const [playerOutId, setPlayerOutId] = useState("");
  const [fielderId, setFielderId] = useState("");
  const [newBatterId, setNewBatterId] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await matchService.get(token, id);
      setMatch(data.match);
      // keep innings index within range
      const i0 = data.match?.innings?.[0];
      const i1 = data.match?.innings?.[1];
      if (i0?.completed && i1 && !i1.completed) setInningsIndex(1);
      if (i0?.strikerId) setStrikerId(String(i0.strikerId?._id || i0.strikerId));
      if (i0?.nonStrikerId) setNonStrikerId(String(i0.nonStrikerId?._id || i0.nonStrikerId));
      if (i0?.currentBowlerId) setBowlerId(String(i0.currentBowlerId?._id || i0.currentBowlerId));
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load match");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const inn = match?.innings?.[inningsIndex] || null;
  const battingTeamKey = inn?.battingTeam;
  const bowlingTeamKey = inn?.bowlingTeam;

  const teamA = match?.teamA;
  const teamB = match?.teamB;

  const battingMembers = useMemo(() => {
    const t = battingTeamKey === "A" ? teamA : teamB;
    return (t?.members || []).map((x) => ({ _id: String(x._id || x), name: x.name || "Player", userId: x.userId || "" }));
  }, [battingTeamKey, teamA, teamB]);

  const bowlingMembers = useMemo(() => {
    const t = bowlingTeamKey === "A" ? teamA : teamB;
    return (t?.members || []).map((x) => ({ _id: String(x._id || x), name: x.name || "Player", userId: x.userId || "" }));
  }, [bowlingTeamKey, teamA, teamB]);

  const setupInnings = async () => {
    setError("");
    try {
      await matchService.setupInnings(token, id, { inningsIndex, strikerId, nonStrikerId, bowlerId });
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to setup innings");
    }
  };

  const push = async ({ runsOffBat = 0, extraType = "None", extraRuns = 0, bowlerChangeId = "" } = {}) => {
    setError("");
    try {
      const wicket =
        wicketFlow
          ? { kind: wicketKind, playerOutId: playerOutId || strikerId, fielderId: fielderId || null }
          : { kind: "None" };

      const payload = {
        inningsIndex,
        runsOffBat,
        extraType,
        extraRuns,
        wicket,
        newBatterId: wicketFlow ? newBatterId || null : null,
      };
      if (bowlerChangeId) payload.bowlerId = bowlerChangeId;

      await matchService.addDelivery(token, id, payload);
      setWicketFlow(false);
      setPlayerOutId("");
      setFielderId("");
      setNewBatterId("");
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to add ball");
    }
  };

  const isStartOfOver = inn ? inn.legalDeliveries > 0 && inn.legalDeliveries % 6 === 0 : false;
  const over = inn ? legalOverBall(inn.legalDeliveries) : "0.0";

  const strikerLabel = battingMembers.find((p) => p._id === String(strikerId))?.name || "—";
  const bowlerLabel = bowlingMembers.find((p) => p._id === String(bowlerId))?.name || "—";

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Match Scoring</h2>
          <p className={styles.sub}>
            Innings {inningsIndex + 1} • Over {over} • Striker: {strikerLabel} • Bowler: {bowlerLabel}
          </p>
        </div>
        <button className={styles.refresh} onClick={refresh}>
          Refresh
        </button>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {loading ? <div className={styles.muted}>Loading…</div> : null}

      {match && inn ? (
        <div className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.bigScore}>
              {inn.totalRuns}
              <span className={styles.sep}>/</span>
              {inn.totalWickets}
            </div>
            <div className={styles.muted}>Overs: {over} / {match.oversPerInnings}.0</div>

            <div className={styles.sectionTitle}>Innings setup</div>
            <div className={styles.row3}>
              <select className={styles.input} value={strikerId} onChange={(e) => setStrikerId(e.target.value)}>
                <option value="">Select striker</option>
                {battingMembers.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} @{p.userId}
                  </option>
                ))}
              </select>
              <select className={styles.input} value={nonStrikerId} onChange={(e) => setNonStrikerId(e.target.value)}>
                <option value="">Select non-striker</option>
                {battingMembers.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} @{p.userId}
                  </option>
                ))}
              </select>
              <select className={styles.input} value={bowlerId} onChange={(e) => setBowlerId(e.target.value)}>
                <option value="">Select bowler</option>
                {bowlingMembers.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} @{p.userId}
                  </option>
                ))}
              </select>
            </div>
            <button className={styles.primary} onClick={setupInnings}>
              Save setup
            </button>

            {isStartOfOver ? (
              <div className={styles.notice}>New over: umpire must select/change bowler before scoring this over.</div>
            ) : null}
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Runs</div>
            <div className={styles.btnGrid}>
              {[0, 1, 2, 3, 4, 5, 6].map((r) => (
                <button key={r} className={styles.runBtn} onClick={() => push({ runsOffBat: r, extraType: "None" })}>
                  {r}
                </button>
              ))}
            </div>

            <div className={styles.sectionTitle}>Extras</div>
            <div className={styles.btnRow}>
              <button className={styles.extraBtn} onClick={() => push({ extraType: "Wide", extraRuns: 1 })}>
                Wide +1
              </button>
              <button className={styles.extraBtn} onClick={() => push({ extraType: "NoBall", extraRuns: 1 })}>
                No Ball +1
              </button>
            </div>

            <div className={styles.sectionTitle}>Wicket</div>
            {!wicketFlow ? (
              <button className={styles.wicketBtn} onClick={() => setWicketFlow(true)}>
                WICKET
              </button>
            ) : (
              <>
                <div className={styles.row3}>
                  <select className={styles.input} value={wicketKind} onChange={(e) => setWicketKind(e.target.value)}>
                    {WICKET_KINDS.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                  <select className={styles.input} value={playerOutId} onChange={(e) => setPlayerOutId(e.target.value)}>
                    <option value="">Player out (default striker)</option>
                    {battingMembers.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select className={styles.input} value={fielderId} onChange={(e) => setFielderId(e.target.value)}>
                    <option value="">Fielder (optional)</option>
                    {bowlingMembers.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.row}>
                  <div className={styles.label}>New batter (required if striker is out)</div>
                  <select className={styles.input} value={newBatterId} onChange={(e) => setNewBatterId(e.target.value)}>
                    <option value="">Select new batter</option>
                    {battingMembers
                      .filter((p) => p._id !== String(strikerId) && p._id !== String(nonStrikerId))
                      .map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className={styles.btnRow}>
                  <button className={styles.extraBtn} onClick={() => push({ runsOffBat: 0, extraType: "None" })}>
                    Confirm wicket
                  </button>
                  <button className={styles.ghostBtn} onClick={() => setWicketFlow(false)}>
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
};

