import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { matchService } from "../../services/matchService";
import { MatchCompletedScorecard } from "./MatchCompletedScorecard";
import styles from "./MatchScore.module.css";

const WICKET_KINDS = ["Bowled", "Caught", "LBW", "RunOut", "Stumped", "HitWicket", "ObstructingField", "HandledBall", "TimedOut", "RetiredHurt", "RetiredOut"];

const legalOverBall = (legalDeliveries) => {
  const o = Math.floor(legalDeliveries / 6);
  const b = legalDeliveries % 6;
  return `${o}.${b}`;
};

const toGuestOption = (name) => ({ _id: `guest:${name}`, name, userId: "guest" });

export const MatchScore = () => {
  const { id } = useParams();
  const { token, user } = useAuth();
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
      const nextInningsIndex = i0?.completed && i1 && !i1.completed ? 1 : inningsIndex;
      if (nextInningsIndex !== inningsIndex) setInningsIndex(nextInningsIndex);
      const activeInnings = data.match?.innings?.[nextInningsIndex];
      if (activeInnings?.strikerId) setStrikerId(String(activeInnings.strikerId?._id || activeInnings.strikerId));
      else if (activeInnings?.strikerName) setStrikerId(`guest:${activeInnings.strikerName}`);
      else setStrikerId("");
      if (activeInnings?.nonStrikerId) setNonStrikerId(String(activeInnings.nonStrikerId?._id || activeInnings.nonStrikerId));
      else if (activeInnings?.nonStrikerName) setNonStrikerId(`guest:${activeInnings.nonStrikerName}`);
      else setNonStrikerId("");
      if (activeInnings?.currentBowlerId) setBowlerId(String(activeInnings.currentBowlerId?._id || activeInnings.currentBowlerId));
      else if (activeInnings?.currentBowlerName) setBowlerId(`guest:${activeInnings.currentBowlerName}`);
      else setBowlerId("");
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
    const registered = (t?.members || []).map((x) => ({ _id: String(x._id || x), name: x.name || "Player", userId: x.userId || "" }));
    const guests = (t?.guestMembers || []).map((name) => toGuestOption(String(name || "").trim())).filter((x) => x.name);
    return [...registered, ...guests];
  }, [battingTeamKey, teamA, teamB]);

  const bowlingMembers = useMemo(() => {
    const t = bowlingTeamKey === "A" ? teamA : teamB;
    const registered = (t?.members || []).map((x) => ({ _id: String(x._id || x), name: x.name || "Player", userId: x.userId || "" }));
    const guests = (t?.guestMembers || []).map((name) => toGuestOption(String(name || "").trim())).filter((x) => x.name);
    return [...registered, ...guests];
  }, [bowlingTeamKey, teamA, teamB]);

  const { setupBatters, outBattersList, availableBatters } = useMemo(() => {
    if (!match?.deliveries || !inn) return { setupBatters: battingMembers, outBattersList: [], availableBatters: battingMembers };
    
    const currentBatters = new Set([strikerId, nonStrikerId]);
    
    const innDeliveries = match.deliveries.filter(d => d.inningsIndex === inningsIndex);
    const outBatters = new Set();
    innDeliveries.forEach(d => {
      const isWicket = d.wicket?.kind && d.wicket.kind !== "None" && d.wicket.kind !== "RetiredHurt";
      if (isWicket) {
        if (d.wicket.playerOutId) outBatters.add(String(d.wicket.playerOutId));
        else if (d.wicket.playerOutName) outBatters.add(`guest:${d.wicket.playerOutName}`);
        else if (d.batterId) outBatters.add(String(d.batterId));
        else if (d.batterName) outBatters.add(`guest:${d.batterName}`);
      }
    });

    const setup = battingMembers.filter(p => !outBatters.has(String(p._id)));
    const outList = battingMembers.filter(p => outBatters.has(String(p._id)));
    const available = setup.filter(p => !currentBatters.has(String(p._id)));

    return { setupBatters: setup, outBattersList: outList, availableBatters: available };
  }, [match?.deliveries, inn, battingMembers, inningsIndex, strikerId, nonStrikerId]);

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
        newBatterId: wicketFlow ? (availableBatters.length === 0 ? "ALL_OUT" : (newBatterId || null)) : null,
      };
      const nextBowlerId = bowlerChangeId || (isStartOfOver ? bowlerId : "");
      if (nextBowlerId) payload.bowlerId = nextBowlerId;

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

  const undo = async () => {
    setError("");
    try {
      await matchService.undoDelivery(token, id);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to undo delivery");
    }
  };

  const isStartOfOver = inn ? inn.legalDeliveries > 0 && inn.legalDeliveries % 6 === 0 : false;
  const over = inn ? legalOverBall(inn.legalDeliveries) : "0.0";
  const crr = inn && inn.legalDeliveries > 0 ? (inn.totalRuns / (inn.legalDeliveries / 6)).toFixed(2) : "0.00";
  
  let target = null;
  let rrr = null;
  if (inningsIndex === 1 && match?.innings?.[0]) {
    target = match.innings[0].totalRuns + 1;
    const remainingRuns = target - inn.totalRuns;
    const remainingBalls = (match.oversPerInnings * 6) - inn.legalDeliveries;
    rrr = remainingBalls > 0 ? (remainingRuns / (remainingBalls / 6)).toFixed(2) : "—";
  }

  const thisOverDeliveries = useMemo(() => {
    if (!match?.deliveries || !inn) return [];
    const innDeliveries = match.deliveries.filter(d => d.inningsIndex === inningsIndex);
    const needed = inn.legalDeliveries % 6;
    if (needed === 0) return []; 
    
    let foundLegal = 0;
    const res = [];
    for (let i = innDeliveries.length - 1; i >= 0; i--) {
      const d = innDeliveries[i];
      res.unshift(d);
      const isExtra = d.extraType !== "None";
      const isLegal = !isExtra || d.extraType === "Bye" || d.extraType === "LegBye" || d.extraType === "Penalty";
      if (isLegal) foundLegal++;
      if (foundLegal === needed) break;
    }
    return res;
  }, [match?.deliveries, inningsIndex, inn?.legalDeliveries]);

  const strikerLabel = battingMembers.find((p) => p._id === String(strikerId))?.name || "—";
  const bowlerLabel = bowlingMembers.find((p) => p._id === String(bowlerId))?.name || "—";

  const getCaptainId = (team) => team?.captainId?._id || team?.captainId;
  const isCaptain = match && (String(getCaptainId(match.teamA)) === String(user?._id || user?.id) || String(getCaptainId(match.teamB)) === String(user?._id || user?.id));
  const isCreator = match && String(match.createdByUserId) === String(user?._id || user?.id);
  const isChampionshipOwner = match && match.championshipId && String(match.championshipId.ownerId) === String(user?._id || user?.id);
  const canScore = match && (match.type === "Championship" ? isCaptain : (isCreator || isChampionshipOwner));

  if (match && match.status === "Completed") {
    return <MatchCompletedScorecard match={match} />;
  }

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Match Scoring</h2>
          <p className={styles.sub}>
            Innings {inningsIndex + 1} • Over {over} • Striker: {strikerLabel} • Bowler: {bowlerLabel}
          </p>
        </div>
        <div>
          <button className={styles.refresh} onClick={refresh}>
            Refresh
          </button>
          <button className={styles.refresh} style={{ marginLeft: "10px", background: "transparent", color: "var(--text)", border: "1px solid var(--border)" }} onClick={undo}>
            Undo
          </button>
        </div>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {loading ? <div className={styles.muted}>Loading…</div> : null}

      {match && inn ? (
        <div className={styles.grid}>
          <div className={`glass-card ${styles.card}`}>
            <div className={styles.bigScore}>
              {inn.totalRuns}
              <span className={styles.sep}>/</span>
              {inn.totalWickets}
            </div>
            <div className={styles.muted}>Overs: {over} / {match.oversPerInnings}.0</div>
            <div className={styles.muted} style={{ marginTop: '4px' }}>
              CRR: {crr} {target ? `• RRR: ${rrr}` : ""}
            </div>
            {target ? <div className={styles.muted} style={{ marginTop: '4px', fontWeight: "bold", color: "var(--accent)" }}>Target: {target}</div> : null}

            <div className={styles.sectionTitle}>This Over</div>
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
              {thisOverDeliveries.length === 0 ? <div className={styles.muted}>New Over</div> : null}
              {thisOverDeliveries.map((d, i) => {
                const isWicket = d.wicket?.kind && d.wicket.kind !== "None";
                let label = d.runsOffBat > 0 ? d.runsOffBat.toString() : "•";
                if (isWicket) label = "W";
                else if (d.extraType !== "None") {
                  if (d.extraType === "Wide") label = `${d.extraRuns}Wd`;
                  else if (d.extraType === "NoBall") label = `${d.extraRuns}Nb`;
                  else if (d.extraType === "Bye") label = `${d.extraRuns}B`;
                  else if (d.extraType === "LegBye") label = `${d.extraRuns}Lb`;
                }
                return (
                  <div key={i} style={{ minWidth: '36px', height: '36px', padding: '0 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                    {label}
                  </div>
                );
              })}
            </div>

            {canScore ? (
              <>
                <div className={styles.sectionTitle}>Innings setup</div>
                <div className={styles.row3}>
              <select className={styles.input} value={strikerId} onChange={(e) => setStrikerId(e.target.value)}>
                <option value="">Select striker</option>
                {setupBatters.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.userId && p.userId !== "guest" ? `@${p.userId}` : ''}
                  </option>
                ))}
              </select>
              <select className={styles.input} value={nonStrikerId} onChange={(e) => setNonStrikerId(e.target.value)}>
                <option value="">Select non-striker</option>
                {setupBatters.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.userId && p.userId !== "guest" ? `@${p.userId}` : ''}
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

            {outBattersList.length > 0 && (
              <>
                <div className={styles.sectionTitle}>Out Batsmen</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {outBattersList.map((p) => (
                    <div key={p._id} className={styles.muted} style={{ padding: "4px 12px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "16px", fontSize: "0.85rem" }}>
                      {p.name} {p.userId && p.userId !== "guest" ? `@${p.userId}` : ''} (Out)
                    </div>
                  ))}
                </div>
              </>
            )}
              </>
            ) : (
              <div className={styles.muted} style={{ marginTop: "1rem", padding: "10px", background: "var(--bg-elevated)", borderRadius: "8px", textAlign: "center" }}>
                You are viewing this match as a spectator. Only captains can configure the innings setup.
              </div>
            )}
          </div>

          <div className={`glass-card ${styles.card}`}>
            {canScore ? (
              <>
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
                <div className={styles.btnRow} style={{ marginTop: "8px" }}>
                  <button className={styles.extraBtn} onClick={() => push({ extraType: "Bye", extraRuns: 1 })}>
                    Bye +1
                  </button>
                  <button className={styles.extraBtn} onClick={() => push({ extraType: "LegBye", extraRuns: 1 })}>
                    Leg Bye +1
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
                      {availableBatters.length === 0 ? (
                        <div className={styles.muted} style={{ padding: "8px", background: "var(--bg-elevated)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                          No batters remaining. Team is ALL OUT.
                        </div>
                      ) : (
                        <select className={styles.input} value={newBatterId} onChange={(e) => setNewBatterId(e.target.value)}>
                          <option value="">Select new batter</option>
                          {availableBatters.map((p) => (
                            <option key={p._id} value={p._id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      )}
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
              </>
            ) : (
              <div className={styles.muted} style={{ textAlign: "center", padding: "40px 20px" }}>
                <span style={{ fontSize: "2rem", display: "block", marginBottom: "10px" }}>🏏</span>
                Live Scoring is active. The captains are currently scoring this match.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
};

