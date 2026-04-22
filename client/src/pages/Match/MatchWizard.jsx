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
  const [resolvedPlayers, setResolvedPlayers] = useState([]);
  const [guestPlayers, setGuestPlayers] = useState([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState(() => new Set());

  const [teamMode, setTeamMode] = useState("Random"); // Random | Manual
  const [teamAName, setTeamAName] = useState("Team A");
  const [teamBName, setTeamBName] = useState("Team B");
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
        setSelectedPlayerIds(new Set([user?._id || user?.id].filter(Boolean)));
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
    const currentId = user?._id || user?.id;
    if (currentId) list.push({ _id: currentId, name: user.name, userId: user.userId });
    friends.forEach((f) => list.push(f));
    resolvedPlayers.forEach((p) => list.push(p));
    guestPlayers.forEach((g) => list.push(g));
    // de-dupe by _id
    const seen = new Set();
    return list.filter((x) => {
      const k = String(x._id);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [friends, guestPlayers, resolvedPlayers, user?._id, user?.id, user?.name, user?.userId]);

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
      const currentId = user?._id || user?.id;
      if (currentId) next.add(String(currentId));
      return next;
    });
  };

  const parseManualIds = () => {
    return manualUserIds
      .split(/\r?\n|,/g)
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const resolveManualPlayers = async () => {
    const manualHandles = parseManualIds();
    if (manualHandles.length === 0) return;
    setError("");
    try {
      const resolved = await userService.resolve(token, manualHandles);
      const resolvedUsers = (resolved.users || []).map((u) => ({
        _id: String(u._id),
        name: u.name || "Player",
        userId: u.userId || "",
      }));
      
      let nextGuests = [];
      if (resolved?.missing?.length) {
        nextGuests = resolved.missing.map((name) => ({ _id: `guest:${name}`, name, userId: "guest", isGuest: true }));
      }

      if (resolvedUsers.length) {
        setResolvedPlayers((prev) => {
          const byId = new Map(prev.map((p) => [String(p._id), p]));
          resolvedUsers.forEach((p) => byId.set(String(p._id), p));
          return Array.from(byId.values());
        });
      }

      if (nextGuests.length) {
        setGuestPlayers((prev) => {
          const byId = new Map(prev.map((p) => [String(p._id), p]));
          nextGuests.forEach((g) => byId.set(String(g._id), g));
          return Array.from(byId.values());
        });
      }

      setSelectedPlayerIds((prev) => {
        const next = new Set(prev);
        resolvedUsers.forEach((u) => next.add(String(u._id)));
        nextGuests.forEach((g) => next.add(String(g._id)));
        return next;
      });

      setManualUserIds("");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to resolve players");
    }
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
      const effectiveTeamAIds = new Set(teamAIds);
      const effectiveTeamBIds = new Set(teamBIds);
      if (manualHandles.length > 0) {
        const resolved = await userService.resolve(token, manualHandles);
        const resolvedUsers = (resolved.users || []).map((u) => ({
          _id: String(u._id),
          name: u.name || "Player",
          userId: u.userId || "",
        }));
        resolvedUsers.forEach((u) => allIds.add(String(u._id)));
        if (resolvedUsers.length) {
          setResolvedPlayers((prev) => {
            const byId = new Map(prev.map((p) => [String(p._id), p]));
            resolvedUsers.forEach((p) => byId.set(String(p._id), p));
            return Array.from(byId.values());
          });
        }
        let unresolvedGuestIds = [];
        if (resolved?.missing?.length) {
          const nextGuests = resolved.missing.map((name) => ({ _id: `guest:${name}`, name, userId: "guest", isGuest: true }));
          setGuestPlayers((prev) => {
            const byId = new Map(prev.map((p) => [String(p._id), p]));
            nextGuests.forEach((g) => byId.set(String(g._id), g));
            return Array.from(byId.values());
          });
          unresolvedGuestIds = nextGuests.map((g) => String(g._id));
          unresolvedGuestIds.forEach((id) => allIds.add(id));
        }

        // Keep unresolved guest handles in team allocation so they can be scored by name.
        if (unresolvedGuestIds.length) {
          unresolvedGuestIds.forEach((gid) => {
            const inA = effectiveTeamAIds.has(gid);
            const inB = effectiveTeamBIds.has(gid);
            if (inA || inB) return;
            if (effectiveTeamAIds.size <= effectiveTeamBIds.size) effectiveTeamAIds.add(gid);
            else effectiveTeamBIds.add(gid);
          });
        }
      }

      const teamAMemberIds = Array.from(effectiveTeamAIds).filter((id) => !String(id).startsWith("guest:"));
      const teamBMemberIds = Array.from(effectiveTeamBIds).filter((id) => !String(id).startsWith("guest:"));
      const teamAGuestMembers = Array.from(effectiveTeamAIds)
        .filter((id) => String(id).startsWith("guest:"))
        .map((id) => String(id).slice("guest:".length));
      const teamBGuestMembers = Array.from(effectiveTeamBIds)
        .filter((id) => String(id).startsWith("guest:"))
        .map((id) => String(id).slice("guest:".length));

      const formatCapWk = (id) => String(id).startsWith("guest:") ? { id: null, name: String(id).slice("guest:".length) } : { id: id || null, name: "" };
      const capA = formatCapWk(captainA);
      const capB = formatCapWk(captainB);
      const wkAFormatted = formatCapWk(wkA);
      const wkBFormatted = formatCapWk(wkB);

      const payload = {
        type,
        bookingId: type === "Turf" ? bookingId : null,
        oversPerInnings: Number(overs),
        players: Array.from(allIds).filter((id) => !String(id).startsWith("guest:")),
        teamA: {
          name: teamAName || "Team A",
          members: teamAMemberIds,
          guestMembers: teamAGuestMembers,
          captainId: capA.id,
          captainName: capA.name,
          wicketKeeperId: wkAFormatted.id,
          wicketKeeperName: wkAFormatted.name,
        },
        teamB: {
          name: teamBName || "Team B",
          members: teamBMemberIds,
          guestMembers: teamBGuestMembers,
          captainId: capB.id,
          captainName: capB.name,
          wicketKeeperId: wkBFormatted.id,
          wicketKeeperName: wkBFormatted.name,
        },
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
              const locked = String(user?._id || user?.id) === id;
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
              <div className={styles.muted}>Example: rohit_07, aman_11</div>
              <button type="button" className={styles.ghostBtn} onClick={resolveManualPlayers} style={{ padding: "4px 12px", border: "1px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text)" }}>Add to Player Pool</button>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Teams</div>
          <div className={styles.row2}>
            <div className={styles.row}>
              <div className={styles.label}>Team A Name</div>
              <input className={styles.input} type="text" value={teamAName} onChange={(e) => setTeamAName(e.target.value)} />
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Team B Name</div>
              <input className={styles.input} type="text" value={teamBName} onChange={(e) => setTeamBName(e.target.value)} />
            </div>
          </div>
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
            <div style={{ margin: "16px 0", padding: "16px", border: "1px solid var(--border)", borderRadius: "8px" }}>
              <div className={styles.label} style={{ marginBottom: "12px" }}>Assign Players</div>
              {selectedPlayers.length === 0 ? <div className={styles.muted}>No players selected.</div> : null}
              {selectedPlayers.map((p) => {
                const id = String(p._id);
                const isA = teamAIds.has(id);
                const isB = teamBIds.has(id);
                return (
                  <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div>{p.name} {p.userId ? `@${p.userId}` : ""}</div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        type="button" 
                        className={isA ? styles.playerOn : styles.playerOff} 
                        style={{ padding: "4px 12px", minWidth: "80px" }}
                        onClick={() => {
                          setTeamBIds(prev => { const next = new Set(prev); next.delete(id); return next; });
                          setTeamAIds(prev => { const next = new Set(prev); next.add(id); return next; });
                        }}>
                        Team A
                      </button>
                      <button 
                        type="button" 
                        className={isB ? styles.playerOn : styles.playerOff} 
                        style={{ padding: "4px 12px", minWidth: "80px" }}
                        onClick={() => {
                          setTeamAIds(prev => { const next = new Set(prev); next.delete(id); return next; });
                          setTeamBIds(prev => { const next = new Set(prev); next.add(id); return next; });
                        }}>
                        Team B
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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

          <div className={styles.row2}>
            <div className={styles.row}>
              <div className={styles.label}>Team A List</div>
              <div className={styles.muted}>
                {Array.from(teamAIds)
                  .map((id) => {
                    const p = allSelectablePlayers.find((x) => String(x._id) === String(id));
                    if (!p) return null;
                    const isCreator = String(p._id) === String(user?.id);
                    return `${p.name}${isCreator ? " (creator)" : ""}`;
                  })
                  .filter(Boolean)
                  .join(", ") || "No players selected"}
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Team B List</div>
              <div className={styles.muted}>
                {Array.from(teamBIds)
                  .map((id) => {
                    const p = allSelectablePlayers.find((x) => String(x._id) === String(id));
                    if (!p) return null;
                    const isCreator = String(p._id) === String(user?.id);
                    return `${p.name}${isCreator ? " (creator)" : ""}`;
                  })
                  .filter(Boolean)
                  .join(", ") || "No players selected"}
              </div>
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

