import React, { useMemo } from "react";
import styles from "./MatchScore.module.css";

const legalOverBall = (count) => {
  const overs = Math.floor(count / 6);
  const balls = count % 6;
  return `${overs}.${balls}`;
};

export const MatchCompletedScorecard = ({ match }) => {
  const getPlayerName = (idOrName) => {
    if (!idOrName) return "Unknown";
    const id = idOrName._id || idOrName;
    const p1 = match.players?.find(p => String(p._id) === String(id));
    if (p1) return p1.name;
    const p2 = match.teamA?.members?.find(p => String(p._id) === String(id));
    if (p2) return p2.name;
    const p3 = match.teamB?.members?.find(p => String(p._id) === String(id));
    if (p3) return p3.name;
    return idOrName;
  };

  const computeStats = (inningsIndex) => {
    const inn = match.innings?.[inningsIndex];
    if (!inn) return { batting: [], bowling: [] };

    const deliveries = (match.deliveries || []).filter((d) => d.inningsIndex === inningsIndex);

    const battingMap = {};
    const bowlingMap = {};

    deliveries.forEach((d) => {
      // Batting
      const batterId = d.batterId || d.batterName;
      if (!battingMap[batterId]) {
        battingMap[batterId] = { player: getPlayerName(d.batterId) || d.batterName || "Unknown", runs: 0, balls: 0, fours: 0, sixes: 0, out: false, howOut: "" };
      }
      const b = battingMap[batterId];
      b.runs += Number(d.runsOffBat || 0);

      const isExtra = d.extraType !== "None";
      const isLegalBatBall = !isExtra || d.extraType === "Bye" || d.extraType === "LegBye" || d.extraType === "Penalty";
      if (isLegalBatBall) b.balls += 1;
      
      if (Number(d.runsOffBat) === 4) b.fours += 1;
      if (Number(d.runsOffBat) === 6) b.sixes += 1;

      const isWicket = d.wicket?.kind && d.wicket.kind !== "None";
      if (isWicket) {
        const outPlayer = d.wicket.playerOutId || d.wicket.playerOutName || batterId;
        if (!battingMap[outPlayer]) {
          battingMap[outPlayer] = { player: getPlayerName(d.wicket.playerOutId) || d.wicket.playerOutName || "Unknown", runs: 0, balls: 0, fours: 0, sixes: 0, out: false, howOut: "" };
        }
        battingMap[outPlayer].out = true;
        let how = d.wicket.kind;
        const bowlerName = getPlayerName(d.bowlerId) || d.bowlerName || "Unknown";
        if (d.wicket.fielderId || d.wicket.fielderName) {
           const fielderName = getPlayerName(d.wicket.fielderId) || d.wicket.fielderName || "Unknown";
           how += ` b ${bowlerName} c ${fielderName}`;
        }
        else if (d.wicket.kind !== "RunOut" && d.wicket.kind !== "HitWicket") how += ` b ${bowlerName}`;
        battingMap[outPlayer].howOut = how;
      }

      // Bowling
      if (d.bowlerId || d.bowlerName) {
        const bowlerId = d.bowlerId || d.bowlerName;
        if (!bowlingMap[bowlerId]) {
          bowlingMap[bowlerId] = { player: getPlayerName(d.bowlerId) || d.bowlerName || "Unknown", balls: 0, runsConceded: 0, wickets: 0, wides: 0, noBalls: 0 };
        }
        const bo = bowlingMap[bowlerId];
        
        let ballRuns = Number(d.runsOffBat || 0);
        if (isExtra) {
           if (d.extraType === "Wide" || d.extraType === "NoBall") {
             ballRuns += Number(d.extraRuns || 0);
             if (d.extraType === "Wide") bo.wides += Number(d.extraRuns || 0);
             if (d.extraType === "NoBall") bo.noBalls += Number(d.extraRuns || 0);
           }
        }
        bo.runsConceded += ballRuns;

        const isLegalBowlBall = !isExtra || d.extraType === "Bye" || d.extraType === "LegBye" || d.extraType === "Penalty";
        if (isLegalBowlBall) bo.balls += 1;

        if (isWicket && !["RunOut", "ObstructingField", "RetiredHurt", "RetiredOut", "TimedOut"].includes(d.wicket.kind)) {
          bo.wickets += 1;
        }
      }
    });

    const batting = Object.values(battingMap).map((b) => {
      b.strikeRate = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : "0.0";
      return b;
    });

    const bowling = Object.values(bowlingMap).map((bo) => {
      bo.overs = legalOverBall(bo.balls);
      const oversFrac = bo.balls / 6;
      bo.economy = oversFrac > 0 ? (bo.runsConceded / oversFrac).toFixed(1) : "0.0";
      return bo;
    });

    return { batting, bowling };
  };

  const inn1Stats = useMemo(() => computeStats(0), [match]);
  const inn2Stats = useMemo(() => computeStats(1), [match]);

  const renderInnings = (inn, stats, title) => {
    if (!inn) return null;
    return (
      <div className={styles.card} style={{ marginBottom: "20px" }}>
        <div className={styles.sectionTitle} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "10px", marginBottom: "15px" }}>
          {title} <span style={{ float: "right", color: "var(--accent)" }}>{inn.totalRuns}/{inn.totalWickets} ({legalOverBall(inn.legalDeliveries)} ov)</span>
        </div>
        
        <div className={styles.table}>
          <div className={styles.rowHead}>
            <div>Batter</div>
            <div>R</div>
            <div>B</div>
            <div>4s</div>
            <div>6s</div>
            <div>SR</div>
            <div>Status</div>
          </div>
          {stats.batting.map((p, i) => (
            <div key={i} className={styles.row}>
              <div style={{ fontWeight: "bold" }}>{p.player}</div>
              <div>{p.runs}</div>
              <div>{p.balls}</div>
              <div>{p.fours}</div>
              <div>{p.sixes}</div>
              <div>{p.strikeRate}</div>
              <div style={{ fontSize: "0.85rem", color: p.out ? "var(--text-muted)" : "var(--accent)" }}>{p.out ? p.howOut : "not out"}</div>
            </div>
          ))}
          {stats.batting.length === 0 && <div className={styles.muted}>No batting data.</div>}
        </div>

        <div className={styles.sectionTitle} style={{ marginTop: "20px", marginBottom: "15px" }}>Bowling</div>
        <div className={styles.table}>
          <div className={styles.rowHead} style={{ gridTemplateColumns: "1.4fr repeat(6, 0.6fr)" }}>
            <div>Bowler</div>
            <div>O</div>
            <div>R</div>
            <div>W</div>
            <div>Wd</div>
            <div>Nb</div>
            <div>Econ</div>
          </div>
          {stats.bowling.map((p, i) => (
            <div key={i} className={styles.row} style={{ gridTemplateColumns: "1.4fr repeat(6, 0.6fr)" }}>
              <div style={{ fontWeight: "bold" }}>{p.player}</div>
              <div>{p.overs}</div>
              <div>{p.runsConceded}</div>
              <div>{p.wickets}</div>
              <div>{p.wides}</div>
              <div>{p.noBalls}</div>
              <div>{p.economy}</div>
            </div>
          ))}
          {stats.bowling.length === 0 && <div className={styles.muted}>No bowling data.</div>}
        </div>
      </div>
    );
  };

  const resultStr = useMemo(() => {
    if (!match.innings || match.innings.length < 2) return "Match Completed";
    const i1 = match.innings[0];
    const i2 = match.innings[1];
    
    if (i2.totalRuns > i1.totalRuns) {
      const wicks = match.teamA.members?.length ? match.teamA.members.length - 1 - i2.totalWickets : 10 - i2.totalWickets;
      const teamName = i2.battingTeam === "A" ? match.teamA?.name || "Team A" : match.teamB?.name || "Team B";
      return `${teamName} won by ${wicks} wicket${wicks !== 1 ? 's' : ''}`;
    } else if (i1.totalRuns > i2.totalRuns) {
      const runs = i1.totalRuns - i2.totalRuns;
      const teamName = i1.battingTeam === "A" ? match.teamA?.name || "Team A" : match.teamB?.name || "Team B";
      return `${teamName} won by ${runs} run${runs !== 1 ? 's' : ''}`;
    } else {
      return "Match Tied";
    }
  }, [match]);

  return (
    <section className={styles.wrap}>
      <div className={styles.header} style={{ textAlign: "center", display: "block" }}>
        <h2 className={styles.title} style={{ fontSize: "2.5rem", textShadow: "var(--neon-glow)" }}>Match Complete</h2>
        <div style={{ fontSize: "1.2rem", color: "var(--accent)", marginTop: "10px", fontWeight: "bold", textTransform: "uppercase" }}>
          {resultStr}
        </div>
      </div>

      <div className={styles.grid} style={{ gridTemplateColumns: "1fr", gap: "24px", marginTop: "20px" }}>
        {renderInnings(match.innings[0], inn1Stats, `${match.innings[0].battingTeam === "A" ? match.teamA?.name || "Team A" : match.teamB?.name || "Team B"} Innings`)}
        {renderInnings(match.innings[1], inn2Stats, `${match.innings[1].battingTeam === "A" ? match.teamA?.name || "Team A" : match.teamB?.name || "Team B"} Innings`)}
      </div>
    </section>
  );
};
