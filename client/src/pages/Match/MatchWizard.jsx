import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { bookingService } from "../../services/bookingService";
import { friendService } from "../../services/friendService";
import { matchService } from "../../services/matchService";
import { userService } from "../../services/userService";
import styles from "./MatchWizard.module.css";

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const chunkAlternate = (arr) => {
  const A = [];
  const B = [];
  arr.forEach((x, i) => (i % 2 === 0 ? A.push(x) : B.push(x)));
  return { A, B };
};

export const MatchWizard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [type, setType] = useState("Local"); // Local | Turf
  const [overs, setOvers] = useState(5);
  const [bookings, setBookings] = useState([]);
  const [bookingId, setBookingId] = useState("");
  const [friends, setFriends] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [manualUserIds, setManualUserIds] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(() => new Set());

  const [teamMode, setTeamMode] = useState("Random"); // Random | Manual
  const [teamAIds, setTeamAIds] = useState(() => new Set());
  const [teamBIds, setTeamBIds] = useState(() => new Set());
  const [captainA, setCaptainA] = useState("");
  const [captainB, setCaptainB] = useState("");
  const [wkA, setWkA] = useState("");
  const [wkB, setWkB] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const [bData, fData] = await Promise.all([bookingService.listMine(token), friendService.list(token)]);
        if (!mounted) return;
        setBookings(bData.bookings || []);
        setFriends(fData.friends || []);
        setSelectedPlayerIds(new Set([user?.id].filter(Boolean)));
      } catch (err) {
        if (mounted) setError(err?.response?.data?.message || "Failed to load match setup data");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [token, user?.id]);

  const allSelectablePlayers = useMemo(() => {
    const list = [];
    if (user?.id) list.push({ _id: user.id, name: user.name, userId: user.userId });
    friends.forEach((f) => list.push(f));
    // de-dupe by _id
    const seen = new Set();
    return list.filter((x) => {
      const k = String(x._id);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [friends, user?.id, user?.name, user?.userId]);

  const selectedPlayers = useMemo(() => {
    const ids = selectedPlayerIds;
    return allSelectablePlayers.filter((p) => ids.has(String(p._id)));
  }, [allSelectablePlayers, selectedPlayerIds]);

  const applyRandomTeams = () => {
    const s = shuffle(selectedPlayers.map((p) => p._id));
    const { A, B } = chunkAlternate(s);
    setTeamAIds(new Set(A.map(String)));
    setTeamBIds(new Set(B.map(String)));
    setCaptainA(A[0] ? String(A[0]) : "");
    setCaptainB(B[0] ? String(B[0]) : "");
    setWkA(A[1] ? String(A[1]) : "");
    setWkB(B[1] ? String(B[1]) : "");
  };

  const togglePick = (id) => {
    setSelectedPlayerIds((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      // ensure current user always included
      if (user?.id) next.add(String(user.id));
      return next;
    });
  };

  const parseManualIds = () => {
    return manualUserIds
      .split(/\r?\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const onCreate = async () => {
    setError("");
    try {
      if (type === "Turf" && !bookingId) {
        setError("Select a turf booking for Turf match.");
        return;
      }
      if (Number(overs) < 1) {
        setError("Overs must be at least 1.");
        return;
      }

      // Add typed userIds (handles like rohit_07)
      const manualHandles = parseManualIds();
      const allIds = new Set(selectedPlayers.map((p) => String(p._id)));
      if (manualHandles.length > 0) {
        const resolved = await userService.resolve(token, manualHandles);
        if (resolved?.missing?.length) {
          setError(`Unknown userId(s): ${resolved.missing.join(", ")}`);
          return;
        }
        (resolved.users || []).forEach((u) => allIds.add(String(u._id)));
      }

      const payload = {
        type,
        bookingId: type === "Turf" ? bookingId : null,
        oversPerInnings: Number(overs),
        players: Array.from(allIds),
        teamA: { name: "Team A", members: Array.from(teamAIds), captainId: captainA || null, wicketKeeperId: wkA || null },
        teamB: { name: "Team B", members: Array.from(teamBIds), captainId: captainB || null, wicketKeeperId: wkB || null },
      };

      const { match } = await matchService.create(token, payload);
      navigate(`/match/${match._id}/toss`, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create match");
    }
  };

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Create Match</h2>
          <p className={styles.sub}>Choose match type, players, overs, teams, captain & wicketkeeper.</p>
        </div>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {loading ? <div className={styles.muted}>Loading…</div> : null}

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Match</div>
          <div className={styles.row2}>
            <div className={styles.row}>
              <div className={styles.label}>Type</div>
              <select className={styles.input} value={type} onChange={(e) => setType(e.target.value)}>
                <option value="Local">Local match</option>
                <option value="Turf">Turf match (from booking)</option>
              </select>
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Overs per innings</div>
              <input className={styles.input} type="number" value={overs} onChange={(e) => setOvers(e.target.value)} />
            </div>
          </div>

          {type === "Turf" ? (
            <div className={styles.row}>
              <div className={styles.label}>Select booking</div>
              <select className={styles.input} value={bookingId} onChange={(e) => setBookingId(e.target.value)}>
                <option value="">Select…</option>
                {bookings.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b?.turfId?.name || "Turf"} • {b.date} {b.timeSlot} • {b.status}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Players</div>
          <div className={styles.muted}>You are included by default.</div>

          <div className={styles.playerGrid}>
            {allSelectablePlayers.map((p) => {
              const id = String(p._id);
              const checked = selectedPlayerIds.has(id);
              const locked = String(user?.id) === id;
              return (
                <button
                  key={id}
                  className={checked ? styles.playerOn : styles.playerOff}
                  onClick={() => (locked ? null : togglePick(id))}
                  disabled={locked}
                  type="button"
                >
                  {p.name} @{p.userId}
                  {locked ? " (you)" : ""}
                </button>
              );
            })}
          </div>

          <div className={styles.row}>
            <div className={styles.label}>Add members by typing their User ID (comma/newline)</div>
            <textarea className={styles.textarea} value={manualUserIds} onChange={(e) => setManualUserIds(e.target.value)} />
            <div className={styles.muted}>Example: rohit_07, aman_11</div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Teams</div>
          <div className={styles.row2}>
            <div className={styles.row}>
              <div className={styles.label}>Mode</div>
              <select className={styles.input} value={teamMode} onChange={(e) => setTeamMode(e.target.value)}>
                <option value="Random">Randomize</option>
                <option value="Manual">Manual</option>
              </select>
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Action</div>
              <button className={styles.primary} type="button" onClick={applyRandomTeams}>
                Randomize teams
              </button>
            </div>
          </div>

          {teamMode === "Manual" ? (
            <div className={styles.muted}>Manual picking UI is next; use Randomize for now.</div>
          ) : null}

          <div className={styles.row2}>
            <div className={styles.row}>
              <div className={styles.label}>Captain (Team A)</div>
              <select className={styles.input} value={captainA} onChange={(e) => setCaptainA(e.target.value)}>
                <option value="">Select…</option>
                {Array.from(teamAIds).map((id) => {
                  const p = allSelectablePlayers.find((x) => String(x._id) === String(id));
                  return (
                    <option key={id} value={id}>
                      {p?.name || id}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Captain (Team B)</div>
              <select className={styles.input} value={captainB} onChange={(e) => setCaptainB(e.target.value)}>
                <option value="">Select…</option>
                {Array.from(teamBIds).map((id) => {
                  const p = allSelectablePlayers.find((x) => String(x._id) === String(id));
                  return (
                    <option key={id} value={id}>
                      {p?.name || id}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className={styles.row2}>
            <div className={styles.row}>
              <div className={styles.label}>Wicketkeeper (Team A)</div>
              <select className={styles.input} value={wkA} onChange={(e) => setWkA(e.target.value)}>
                <option value="">Select…</option>
                {Array.from(teamAIds).map((id) => {
                  const p = allSelectablePlayers.find((x) => String(x._id) === String(id));
                  return (
                    <option key={id} value={id}>
                      {p?.name || id}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Wicketkeeper (Team B)</div>
              <select className={styles.input} value={wkB} onChange={(e) => setWkB(e.target.value)}>
                <option value="">Select…</option>
                {Array.from(teamBIds).map((id) => {
                  const p = allSelectablePlayers.find((x) => String(x._id) === String(id));
                  return (
                    <option key={id} value={id}>
                      {p?.name || id}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className={styles.actions}>
            <button className={styles.primary} type="button" onClick={onCreate}>
              Continue to Toss
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

