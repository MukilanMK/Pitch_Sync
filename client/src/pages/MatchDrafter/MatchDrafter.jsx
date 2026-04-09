import { useMemo, useState } from "react";
import styles from "./MatchDrafter.module.css";

const fisherYatesShuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const parseNames = (raw) => {
  return raw
    .split(/\r?\n|,/g)
    .map((s) => s.trim())
    .filter(Boolean);
};

export const MatchDrafter = () => {
  const [raw, setRaw] = useState("Aman\nRohit\nZaid\nKaran\nSameer\nIshaan\nNeel");
  const [seed, setSeed] = useState(0);

  const { shuffled, teamA, teamB } = useMemo(() => {
    // seed is intentionally read so changing it re-shuffles
    void seed;
    const names = parseNames(raw);
    const s = fisherYatesShuffle(names);
    const cut = Math.ceil(s.length / 2);
    return { shuffled: s, teamA: s.slice(0, cut), teamB: s.slice(cut) };
  }, [raw, seed]);

  return (
    <section className={styles.grid}>
      <div className={styles.card}>
        <div className={styles.title}>Match Drafter</div>
        <div className={styles.sub}>Paste player names. We shuffle fairly and handle odd numbers cleanly.</div>

        <textarea className={styles.textarea} value={raw} onChange={(e) => setRaw(e.target.value)} />

        <div className={styles.actions}>
          <button className={styles.primary} onClick={() => setSeed((x) => x + 1)}>
            Shuffle & Draft
          </button>
          <button className={styles.secondary} onClick={() => setRaw("")}>
            Clear
          </button>
        </div>

        <div className={styles.meta}>
          Players: <span className={styles.metaStrong}>{shuffled.length}</span> • Team A:{" "}
          <span className={styles.metaStrong}>{teamA.length}</span> • Team B:{" "}
          <span className={styles.metaStrong}>{teamB.length}</span>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.teams}>
          <div className={styles.team}>
            <div className={styles.teamHeader}>
              <div className={styles.teamName}>Team A</div>
              <div className={styles.badge}>{teamA.length}</div>
            </div>
            <ol className={styles.list}>
              {teamA.map((p) => (
                <li key={p} className={styles.player}>
                  {p}
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.team}>
            <div className={styles.teamHeader}>
              <div className={styles.teamName}>Team B</div>
              <div className={styles.badge}>{teamB.length}</div>
            </div>
            <ol className={styles.list}>
              {teamB.map((p) => (
                <li key={p} className={styles.player}>
                  {p}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
};

