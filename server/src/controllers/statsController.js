const { Match } = require("../models/Match");
const { isLegalBall } = require("../utils/matchMath");

const getMyStats = async (req, res, next) => {
  try {
    const userId = String(req.user.id);
    const matches = await Match.find({ players: req.user.id }).select("deliveries oversPerInnings status createdAt");

    let battingRuns = 0;
    let battingBalls = 0;
    let fours = 0;
    let sixes = 0;
    let outs = 0;

    let bowlingRuns = 0;
    let bowlingBalls = 0;
    let bowlingWkts = 0;
    let wides = 0;
    let noBalls = 0;

    for (const m of matches) {
      for (const d of m.deliveries || []) {
        const batter = String(d.batterId);
        const bowler = String(d.bowlerId);
        const legal = isLegalBall(d);
        const bat = Number(d.runsOffBat || 0);
        const extra = d.extraType !== "None" ? Number(d.extraRuns || 0) : 0;
        const isWicket = d.wicket?.kind && d.wicket.kind !== "None";
        const outId = d.wicket?.playerOutId ? String(d.wicket.playerOutId) : batter;

        if (batter === userId) {
          battingRuns += bat;
          if (legal) battingBalls += 1;
          if (bat === 4) fours += 1;
          if (bat === 6) sixes += 1;
          if (isWicket && outId === userId) outs += 1;
        }

        if (bowler === userId) {
          bowlingRuns += bat + extra;
          if (d.extraType === "Wide") wides += extra || 1;
          if (d.extraType === "NoBall") noBalls += extra || 1;
          if (legal) bowlingBalls += 1;
          const kind = d.wicket?.kind || "None";
          const credited = ["Bowled", "Caught", "LBW", "Stumped", "HitWicket", "Unknown"].includes(kind);
          if (isWicket && credited) bowlingWkts += 1;
        }
      }
    }

    const battingAvg = outs > 0 ? Number((battingRuns / outs).toFixed(2)) : battingRuns > 0 ? null : 0;
    const strikeRate = battingBalls > 0 ? Number(((battingRuns / battingBalls) * 100).toFixed(2)) : 0;
    const overs = Math.floor(bowlingBalls / 6) + (bowlingBalls % 6) / 6;
    const economy = overs > 0 ? Number((bowlingRuns / overs).toFixed(2)) : 0;

    return res.json({
      stats: {
        matches: matches.length,
        batting: { runs: battingRuns, balls: battingBalls, outs, avg: battingAvg, strikeRate, fours, sixes },
        bowling: { runsConceded: bowlingRuns, balls: bowlingBalls, wickets: bowlingWkts, wides, noBalls, economy },
      },
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { getMyStats };

