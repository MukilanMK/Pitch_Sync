const isLegalBall = (delivery) => {
  const extraType = delivery?.extraType || "None";
  return extraType === "None" || extraType === "Bye" || extraType === "LegBye" || extraType === "Penalty";
};

const overString = (legalDeliveries) => {
  const overs = Math.floor(legalDeliveries / 6);
  const balls = legalDeliveries % 6;
  return `${overs}.${balls}`;
};

const swap = (a, b) => ({ a: b, b: a });

const nextStrikeIds = ({ strikerId, nonStrikerId, legalDeliveries }, delivery) => {
  if (!strikerId || !nonStrikerId) return { strikerId, nonStrikerId };
  const legal = isLegalBall(delivery);
  const totalThisBall = Number(delivery?.runsOffBat || 0) + (delivery?.extraType !== "None" ? Number(delivery?.extraRuns || 0) : 0);

  let s = strikerId;
  let ns = nonStrikerId;

  if (legal && totalThisBall % 2 === 1) {
    const swapped = swap(s, ns);
    s = swapped.a;
    ns = swapped.b;
  }

  const nextLegal = legalDeliveries + (legal ? 1 : 0);
  if (legal && nextLegal % 6 === 0) {
    const swapped = swap(s, ns);
    s = swapped.a;
    ns = swapped.b;
  }

  return { strikerId: s, nonStrikerId: ns, nextLegalDeliveries: nextLegal };
};

module.exports = { isLegalBall, overString, nextStrikeIds };

