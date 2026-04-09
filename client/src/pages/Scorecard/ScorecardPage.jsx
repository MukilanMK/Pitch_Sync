import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { scorecardService } from "../../services/scorecardService";
import styles from "./ScorecardPage.module.css";

const WICKET_KINDS = [
  "None",
  "Bowled",
  "Caught",
  "LBW",
  "RunOut",
  "Stumped",
  "HitWicket",
  "ObstructingField",
  "HandledBall",
  "TimedOut",
  "RetiredHurt",
  "RetiredOut",
];

export const ScorecardPage = () => {
  const { bookingId } = useParams();
  const { token } = useAuth();
  const [scorecard, setScorecard] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [batter, setBatter] = useState("");
  const [nonStriker, setNonStriker] = useState("");
  const [bowler, setBowler] = useState("");
  const [isWicketFlow, setIsWicketFlow] = useState(false);
  const [wicketKind, setWicketKind] = useState("Bowled");
  const [playerOut, setPlayerOut] = useState("");
  const [fielder, setFielder] = useState("");

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [data, statsData] = await Promise.all([
        scorecardService.get(token, bookingId),
        scorecardService.getStats(token, bookingId).catch(() => ({ stats: null })),
      ]);
      setScorecard(data.scorecard);
      setStats(statsData?.stats || null);
      if (data?.scorecard?.striker !== undefined) setBatter(data.scorecard.striker || "");
      if (data?.scorecard?.nonStriker !== undefined) setNonStriker(data.scorecard.nonStriker || "");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load scorecard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  const push = async (payload) => {
    setError("");
    try {
      const wicket = isWicketFlow ? { kind: wicketKind, playerOut: playerOut || batter, fielder } : { kind: "None" };

      const data = await scorecardService.addDelivery(token, bookingId, {
        batter,
        nonStriker,
        bowler,
        ...payload,
        wicket,
      });
      setScorecard(data.scorecard);
      if (data?.scorecard?.striker !== undefined) setBatter(data.scorecard.striker || "");
      if (data?.scorecard?.nonStriker !== undefined) setNonStriker(data.scorecard.nonStriker || "");
      setIsWicketFlow(false);
      setPlayerOut("");
      setFielder("");
      const statsData = await scorecardService.getStats(token, bookingId).catch(() => ({ stats: null }));
      setStats(statsData?.stats || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update scorecard");
    }
  };

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Live Scorecard</h2>
          <p className={styles.sub}>Extras add runs but don’t advance legal balls.</p>
        </div>
        <button className={styles.refresh} onClick={refresh}>
          Refresh
        </button>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {loading ? <div className={styles.muted}>Loading…</div> : null}

      {scorecard ? (
        <div className={styles.grid}>
          <div className={styles.bigCard}>
            <div className={styles.scoreLine}>
              <div className={styles.score}>
                {scorecard.totalRuns}
                <span className={styles.sep}>/</span>
                {scorecard.totalWickets}
              </div>
              <div className={styles.overs}>Overs: {scorecard.totalOvers}</div>
            </div>

            <div className={styles.pad}>
              <div className={styles.sectionTitle}>Players (for richer stats)</div>
              <div className={styles.btnRow}>
                <input
                  className={styles.input}
                  placeholder="Batter (striker)"
                  value={batter}
                  onChange={(e) => setBatter(e.target.value)}
                />
                <input
                  className={styles.input}
                  placeholder="Non-striker"
                  value={nonStriker}
                  onChange={(e) => setNonStriker(e.target.value)}
                />
              </div>
              <div className={styles.btnRow}>
                <input
                  className={styles.input}
                  placeholder="Bowler"
                  value={bowler}
                  onChange={(e) => setBowler(e.target.value)}
                />
                <div className={styles.muted} style={{ alignSelf: "center" }}>
                  Striker auto-updates by runs & overs
                </div>
              </div>

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
                <button
                  className={styles.extraBtn}
                  onClick={() => push({ runsOffBat: 0, extraType: "Wide", extraRuns: 1 })}
                >
                  Wide +1
                </button>
                <button
                  className={styles.extraBtn}
                  onClick={() => push({ runsOffBat: 0, extraType: "NoBall", extraRuns: 1 })}
                >
                  No Ball +1
                </button>
              </div>

              <div className={styles.sectionTitle}>Wicket</div>
              {!isWicketFlow ? (
                <button className={styles.wicketBtn} onClick={() => setIsWicketFlow(true)}>
                  WICKET
                </button>
              ) : (
                <>
                  <div className={styles.btnRow}>
                    <select className={styles.select} value={wicketKind} onChange={(e) => setWicketKind(e.target.value)}>
                      {WICKET_KINDS.filter((k) => k !== "None").map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                    <input
                      className={styles.input}
                      placeholder="Player out (default: striker)"
                      value={playerOut}
                      onChange={(e) => setPlayerOut(e.target.value)}
                    />
                  </div>
                  <div className={styles.btnRow}>
                    <input
                      className={styles.input}
                      placeholder="Fielder (if applicable)"
                      value={fielder}
                      onChange={(e) => setFielder(e.target.value)}
                    />
                    <button
                      className={styles.extraBtn}
                      onClick={() => push({ runsOffBat: 0, extraType: "None", isWicket: true })}
                    >
                      Confirm wicket
                    </button>
                  </div>
                  <button className={styles.refresh} onClick={() => setIsWicketFlow(false)}>
                    Cancel wicket
                  </button>
                </>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.sectionTitle}>Recent deliveries</div>
            <div className={styles.list}>
              {(scorecard.deliveries || []).slice(-16).reverse().map((d, idx) => {
                const extra = d.extraType !== "None" ? `${d.extraType}+${d.extraRuns}` : "";
                const wicketKindLabel = d?.wicket?.kind && d.wicket.kind !== "None" ? d.wicket.kind : d.isWicket ? "Wicket" : "";
                const label = [d.runsOffBat ? `${d.runsOffBat}` : "0", extra, wicketKindLabel].filter(Boolean).join(" ");
                const who = [d.batter ? d.batter : "", d.bowler ? `vs ${d.bowler}` : ""].filter(Boolean).join(" ");
                return (
                  <div key={`${scorecard.deliveries.length - idx}`} className={styles.delivery}>
                    <div className={styles.ball}>{label || "0"}</div>
                    <div className={styles.meta}>
                      {who ? <span className={styles.who}>{who}</span> : null}
                      {d.extraType !== "None" ? <span className={styles.extraTag}>{d.extraType}</span> : null}
                      {wicketKindLabel ? <span className={styles.wicketTag}>{wicketKindLabel}</span> : null}
                    </div>
                  </div>
                );
              })}
              {(scorecard.deliveries || []).length === 0 ? <div className={styles.muted}>No deliveries yet.</div> : null}
            </div>
          </div>

          {stats ? (
            <div className={styles.card}>
              <div className={styles.sectionTitle}>Player stats (from stored deliveries)</div>

              <div className={styles.sectionTitle}>Batting</div>
              <div className={styles.table}>
                <div className={styles.rowHead}>
                  <div>Player</div>
                  <div>R</div>
                  <div>B</div>
                  <div>4s</div>
                  <div>6s</div>
                  <div>SR</div>
                  <div>How out</div>
                </div>
                {(stats.batting || []).map((p) => (
                  <div key={`bat-${p.player}`} className={styles.row}>
                    <div>{p.player}</div>
                    <div>{p.runs}</div>
                    <div>{p.balls}</div>
                    <div>{p.fours}</div>
                    <div>{p.sixes}</div>
                    <div>{p.strikeRate}</div>
                    <div>{p.out ? p.howOut || "out" : "not out"}</div>
                  </div>
                ))}
                {(stats.batting || []).length === 0 ? <div className={styles.muted}>No batting stats yet.</div> : null}
              </div>

              <div className={styles.sectionTitle}>Bowling</div>
              <div className={styles.table}>
                <div className={styles.rowHead} style={{ gridTemplateColumns: "1.4fr repeat(6, 0.6fr)" }}>
                  <div>Player</div>
                  <div>O</div>
                  <div>R</div>
                  <div>W</div>
                  <div>Wd</div>
                  <div>Nb</div>
                  <div>Econ</div>
                </div>
                {(stats.bowling || []).map((p) => (
                  <div
                    key={`bowl-${p.player}`}
                    className={styles.row}
                    style={{ gridTemplateColumns: "1.4fr repeat(6, 0.6fr)" }}
                  >
                    <div>{p.player}</div>
                    <div>{p.overs}</div>
                    <div>{p.runsConceded}</div>
                    <div>{p.wickets}</div>
                    <div>{p.wides}</div>
                    <div>{p.noBalls}</div>
                    <div>{p.economy}</div>
                  </div>
                ))}
                {(stats.bowling || []).length === 0 ? <div className={styles.muted}>No bowling stats yet.</div> : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

