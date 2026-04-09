const getOverString = (legalDeliveries) => {
  const overs = Math.floor(legalDeliveries / 6);
  const balls = legalDeliveries % 6;
  return `${overs}.${balls}`;
};

const applyDeliveryToTotals = ({ totalRuns, totalWickets, legalDeliveries }, delivery) => {
  const isExtra = delivery.extraType && delivery.extraType !== "None";
  const extraRuns = isExtra ? Number(delivery.extraRuns || 0) : 0;
  const batRuns = Number(delivery.runsOffBat || 0);

  const nextTotalRuns = totalRuns + batRuns + extraRuns;
  const wicketKind = delivery?.wicket?.kind || (delivery.isWicket ? "Unknown" : "None");
  const isWicket = wicketKind && wicketKind !== "None";
  const nextTotalWickets = totalWickets + (isWicket ? 1 : 0);
  const nextLegalDeliveries = legalDeliveries + (isExtra ? 0 : 1);

  return {
    totalRuns: nextTotalRuns,
    totalWickets: nextTotalWickets,
    legalDeliveries: nextLegalDeliveries,
    totalOvers: getOverString(nextLegalDeliveries),
  };
};

const isLegalBall = (delivery) => {
  const extraType = delivery?.extraType || "None";
  return extraType === "None" || extraType === "Bye" || extraType === "LegBye" || extraType === "Penalty";
};

const swapEnds = (strike) => {
  return { striker: strike.nonStriker || "", nonStriker: strike.striker || "" };
};

const nextStrike = ({ striker, nonStriker, legalDeliveries }, delivery) => {
  const current = { striker: (striker || "").trim(), nonStriker: (nonStriker || "").trim() };

  // If we don't know the batters yet, don't attempt rotation.
  if (!current.striker || !current.nonStriker) return current;

  const legal = isLegalBall(delivery);
  const batRuns = Number(delivery?.runsOffBat || 0);
  const extraType = delivery?.extraType || "None";
  const extraRuns = extraType !== "None" ? Number(delivery?.extraRuns || 0) : 0;

  // We rotate strike on odd *total runs for that delivery* when the ball is legal.
  // (This is a simplification for edge cases like wides with run taken.)
  const totalThisBall = batRuns + extraRuns;
  let after = current;
  if (legal && totalThisBall % 2 === 1) after = swapEnds(after);

  // End of over rotation happens after a legal ball completes the over.
  const nextLegal = legalDeliveries + (legal ? 1 : 0);
  if (legal && nextLegal % 6 === 0) after = swapEnds(after);

  return after;
};

const computePlayerStatsFromDeliveries = (deliveries = []) => {
  const batting = new Map();
  const bowling = new Map();

  const getBat = (name) => {
    const key = (name || "").trim();
    if (!key) return null;
    if (!batting.has(key)) {
      batting.set(key, {
        player: key,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        out: false,
        howOut: "",
      });
    }
    return batting.get(key);
  };

  const getBowl = (name) => {
    const key = (name || "").trim();
    if (!key) return null;
    if (!bowling.has(key)) {
      bowling.set(key, {
        player: key,
        balls: 0,
        overs: "0.0",
        runsConceded: 0,
        wickets: 0,
        wides: 0,
        noBalls: 0,
        economy: 0,
      });
    }
    return bowling.get(key);
  };

  for (const d of deliveries) {
    const bat = getBat(d.batter);
    const bowl = getBowl(d.bowler);

    const batRuns = Number(d.runsOffBat || 0);
    const extraType = d.extraType || "None";
    const extraRuns = extraType !== "None" ? Number(d.extraRuns || 0) : 0;
    const legal = isLegalBall(d);

    // Batter
    if (bat) {
      bat.runs += batRuns;
      if (legal) bat.balls += 1;
      if (batRuns === 4) bat.fours += 1;
      if (batRuns === 6) bat.sixes += 1;
    }

    // Bowler
    if (bowl) {
      bowl.runsConceded += batRuns + extraRuns;
      if (extraType === "Wide") bowl.wides += extraRuns || 1;
      if (extraType === "NoBall") bowl.noBalls += extraRuns || 1;
      if (legal) bowl.balls += 1;

      const wicketKind = d?.wicket?.kind || (d.isWicket ? "Unknown" : "None");
      const isWicket = wicketKind && wicketKind !== "None";
      const isBowlerWicket = ["Bowled", "Caught", "LBW", "Stumped", "HitWicket", "Unknown"].includes(wicketKind);
      if (isWicket && isBowlerWicket) bowl.wickets += 1;
    }

    // Dismissal info
    const wicketKind = d?.wicket?.kind || (d.isWicket ? "Unknown" : "None");
    const isWicket = wicketKind && wicketKind !== "None";
    const outName = (d?.wicket?.playerOut || d?.batter || "").trim();
    if (isWicket && outName) {
      const outBat = getBat(outName);
      if (outBat) {
        outBat.out = true;
        const fielder = (d?.wicket?.fielder || "").trim();
        const bowler = (d?.bowler || "").trim();
        if (wicketKind === "Caught") outBat.howOut = `c ${fielder || "?"} b ${bowler || "?"}`;
        else if (wicketKind === "Bowled") outBat.howOut = `b ${bowler || "?"}`;
        else if (wicketKind === "LBW") outBat.howOut = `lbw b ${bowler || "?"}`;
        else if (wicketKind === "Stumped") outBat.howOut = `st ${fielder || "?"} b ${bowler || "?"}`;
        else if (wicketKind === "RunOut") outBat.howOut = `run out ${fielder || "?"}`;
        else if (wicketKind === "HitWicket") outBat.howOut = `hit wicket b ${bowler || "?"}`;
        else outBat.howOut = wicketKind;
      }
    }
  }

  // finalize bowling rates
  for (const b of bowling.values()) {
    const overs = getOverString(b.balls);
    b.overs = overs;
    const totalOvers = Math.floor(b.balls / 6) + (b.balls % 6) / 6;
    b.economy = totalOvers > 0 ? Number((b.runsConceded / totalOvers).toFixed(2)) : 0;
  }

  // add strike rate
  const battingArr = Array.from(batting.values()).map((x) => ({
    ...x,
    strikeRate: x.balls > 0 ? Number(((x.runs / x.balls) * 100).toFixed(2)) : 0,
  }));
  const bowlingArr = Array.from(bowling.values());

  return { batting: battingArr, bowling: bowlingArr };
};

module.exports = { getOverString, applyDeliveryToTotals, computePlayerStatsFromDeliveries, nextStrike };

