import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { championshipService } from "../../services/championshipService";
import { matchService } from "../../services/matchService";
import { userService } from "../../services/userService";
import styles from "./Championships.module.css";
import { Trophy, Calendar, MapPin, Users, CheckCircle, XCircle } from "lucide-react";

export const ChampionshipDetails = () => {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [championship, setChampionship] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Registration states
  const [teamName, setTeamName] = useState("");
  const [manualUserIds, setManualUserIds] = useState("");

  // Match creation states (Owner)
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [oversPerInnings, setOversPerInnings] = useState(5);
  const [scheduledDate, setScheduledDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");

  // Owner settings
  const [minTeamsInput, setMinTeamsInput] = useState("");
  const [maxTeamsInput, setMaxTeamsInput] = useState("");

  const isOwner = championship && String(championship.ownerId?._id || championship.ownerId) === String(user?._id || user?.id);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await championshipService.getById(token, id);
      setChampionship(data.championship);
      setMatches(data.matches || []);
      if (!minTeamsInput) setMinTeamsInput(data.championship.minTeams);
      if (!maxTeamsInput) setMaxTeamsInput(data.championship.maxTeams);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load championship details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  const onRegisterTeam = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (!teamName) {
        setError("Team name is required.");
        return;
      }
      
      const manualHandles = manualUserIds
        .split(/\r?\n|,/g)
        .map((s) => s.trim())
        .filter(Boolean);
        
      if (manualHandles.length === 0) {
        setError("Please enter at least one player user ID.");
        return;
      }

      const resolved = await userService.resolve(token, manualHandles);
      if (resolved?.missing?.length > 0) {
         setError(`Some users were not found (only registered players allowed): ${resolved.missing.join(", ")}`);
         return;
      }

      const playerIds = resolved.users.map((u) => u._id);

      await championshipService.registerTeam(token, id, {
        teamName,
        playerIds
      });

      setSuccess("Team registered successfully! Waiting for approval.");
      setTeamName("");
      setManualUserIds("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to register team");
    }
  };

  const onApproveTeam = async (teamId, status) => {
    setError("");
    setSuccess("");
    try {
      await championshipService.approveTeam(token, id, { teamId, status });
      setSuccess(`Team ${status.toLowerCase()} successfully.`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update team status");
    }
  };

  const onCreateMatch = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await championshipService.createMatch(token, id, {
        teamAId,
        teamBId,
        oversPerInnings,
        scheduledDate,
        timeSlot
      });
      setSuccess("Match created successfully!");
      setTeamAId("");
      setTeamBId("");
      setScheduledDate("");
      setTimeSlot("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create match");
    }
  };

  const onUpdateSettings = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await championshipService.updateSettings(token, id, {
        minTeams: minTeamsInput,
        maxTeams: maxTeamsInput
      });
      setSuccess("Tournament settings updated.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update settings");
    }
  };

  const onCancelTournament = async () => {
    if (!window.confirm("Are you sure you want to cancel this entire tournament?")) return;
    setError("");
    try {
      await championshipService.cancelChampionship(token, id, { reason: "Cancelled by owner" });
      setSuccess("Tournament cancelled.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to cancel tournament");
    }
  };

  const onCancelMatch = async (matchId) => {
    if (!window.confirm("Are you sure you want to cancel this match?")) return;
    try {
      await matchService.handleScheduling(token, matchId, { action: "cancel" });
      setSuccess("Match cancelled.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to cancel match");
    }
  };

  if (loading) return <div className={styles.wrap}><div className={styles.muted}>Loading…</div></div>;
  if (!championship) return <div className={styles.wrap}><div className={styles.error}>Championship not found.</div></div>;

  const approvedTeams = championship.registeredTeams.filter(t => t.status === "Approved");

  const isAlreadyRegistered = championship.registeredTeams.some(t => 
    t.players.some(p => String(p._id || p) === String(user?._id || user?.id))
  );

  return (
    <section className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>{championship.name}</h2>
          <p className={styles.sub}>Organized by {championship.ownerId?.name || "Turf Owner"}</p>
        </div>
        <span className={`${styles.statusBadge} ${styles[championship.status.toLowerCase()]}`}>
          {championship.status}
        </span>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.grid}>
        <div className={`glass-card ${styles.card}`}>
          <div className={styles.cardTitle}>Details</div>
          <div className={styles.details}>
            <div className={styles.detailRow}>
              <MapPin size={16} className={styles.icon} />
              <span>{championship.turfId?.name} ({championship.turfId?.location})</span>
            </div>
            <div className={styles.detailRow}>
              <Calendar size={16} className={styles.icon} />
              <span>{new Date(championship.startDate).toLocaleDateString()} - {new Date(championship.endDate).toLocaleDateString()}</span>
            </div>
            <div className={styles.detailRow}>
              <Users size={16} className={styles.icon} />
              <span>
                Registered Teams: {championship.registeredTeams.length} / {championship.maxTeams || '∞'}
                {championship.minTeams > 0 ? ` (Min ${championship.minTeams} to start)` : ""}
              </span>
            </div>
            {(championship.firstPrize || championship.secondPrize || championship.thirdPrize) && (
              <div className={styles.detailRow} style={{ alignItems: "flex-start" }}>
                <Trophy size={16} className={styles.icon} style={{ marginTop: "4px" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {championship.firstPrize && <span>🥇 1st: {championship.firstPrize}</span>}
                  {championship.secondPrize && <span>🥈 2nd: {championship.secondPrize}</span>}
                  {championship.thirdPrize && <span>🥉 3rd: {championship.thirdPrize}</span>}
                </div>
              </div>
            )}
            <div className={styles.fee}>Entry Fee: ₹{championship.entryFee}</div>
          </div>
        </div>

        {/* Registration Form (Only for Players if Upcoming/Ongoing) */}
        {!isOwner && championship.status !== "Completed" && user?.role === "Player" && (
          <>
            {!isAlreadyRegistered ? (
              <div className={`glass-card ${styles.card}`}>
                <div className={styles.cardTitle}>Register Team</div>
                <form className={styles.form} onSubmit={onRegisterTeam}>
                  <div className={styles.row}>
                    <div className={styles.label}>Team Name</div>
                    <input className={styles.input} value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
                  </div>
                    <div className={styles.row}>
                      <div className={styles.label}>Players (User IDs, comma separated)</div>
                      <div className={styles.muted} style={{fontSize: "0.8rem", marginBottom: "4px"}}>Note: You (captain) will be automatically added. Only registered players are allowed.</div>
                      <textarea 
                        className={styles.textarea} 
                        value={manualUserIds} 
                        onChange={(e) => setManualUserIds(e.target.value)} 
                        placeholder="e.g. rohit_07, aman_11"
                        required
                      />
                    </div>
                    <button className={styles.primary}>Submit Registration</button>
                </form>
              </div>
            ) : (
              <div className={`glass-card ${styles.card}`}>
                <div className={styles.cardTitle}>Registration Status</div>
                <div className={styles.success}>
                  <CheckCircle size={20} style={{ verticalAlign: "middle", marginRight: "8px" }} />
                  You are already registered for a team in this championship. Good luck!
                </div>
              </div>
            )}
          </>
        )}

        {/* Match Creation Form (Only for Owner) */}
        {isOwner && championship.status !== "Completed" && (
          <div className={`glass-card ${styles.card}`}>
            <div className={styles.cardTitle}>Schedule Match</div>
            {approvedTeams.length < championship.minTeams ? (
              <div className={styles.muted}>
                You need at least {championship.minTeams} approved teams to start scheduling matches. Currently: {approvedTeams.length}.
              </div>
            ) : (
              <form className={styles.form} onSubmit={onCreateMatch}>
                <div className={styles.row2}>
                  <div className={styles.row}>
                    <div className={styles.label}>Team A</div>
                  <select className={styles.input} value={teamAId} onChange={e => setTeamAId(e.target.value)} required>
                    <option value="">Select Team</option>
                    {approvedTeams.map(t => (
                      <option key={t._id} value={t._id}>{t.teamName}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.row}>
                  <div className={styles.label}>Team B</div>
                  <select className={styles.input} value={teamBId} onChange={e => setTeamBId(e.target.value)} required>
                    <option value="">Select Team</option>
                    {approvedTeams.map(t => (
                      <option key={t._id} value={t._id}>{t.teamName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.row2}>
                <div className={styles.row}>
                  <div className={styles.label}>Scheduled Date</div>
                  <input className={styles.input} type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} required />
                </div>
                <div className={styles.row}>
                  <div className={styles.label}>Time Slot</div>
                  <input className={styles.input} type="text" placeholder="e.g. 10:00 AM - 12:00 PM" value={timeSlot} onChange={e => setTimeSlot(e.target.value)} required />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.label}>Overs per innings</div>
                <input className={styles.input} type="number" min="1" value={oversPerInnings} onChange={e => setOversPerInnings(e.target.value)} required />
              </div>
              <button className={styles.primary}>Create Match</button>
            </form>
            )}
          </div>
        )}

        {/* Tournament Settings (Only for Owner) */}
        {isOwner && championship.status !== "Completed" && championship.status !== "Cancelled" && (
          <div className={`glass-card ${styles.card}`}>
            <div className={styles.cardTitle}>Tournament Settings</div>
            <form className={styles.form} onSubmit={onUpdateSettings} style={{ marginBottom: "1rem" }}>
              <div className={styles.row2}>
                <div className={styles.row}>
                  <div className={styles.label}>Minimum Teams</div>
                  <input className={styles.input} type="number" min="2" value={minTeamsInput} onChange={e => setMinTeamsInput(e.target.value)} required />
                </div>
                <div className={styles.row}>
                  <div className={styles.label}>Maximum Teams</div>
                  <input className={styles.input} type="number" min="2" value={maxTeamsInput} onChange={e => setMaxTeamsInput(e.target.value)} required />
                </div>
              </div>
              <button className={styles.primary}>Update Settings</button>
            </form>
            <div className={styles.row}>
              <div className={styles.label}>Danger Zone</div>
              <button type="button" className={styles.dangerBtn} onClick={onCancelTournament}>Cancel Tournament</button>
            </div>
          </div>
        )}

        {/* Teams List */}
        <div className={`glass-card ${styles.card}`}>
          <div className={styles.cardTitle}>Registered Teams</div>
          {championship.registeredTeams.length === 0 ? (
            <div className={styles.muted}>No teams registered yet.</div>
          ) : (
            <div className={styles.list}>
              {championship.registeredTeams.map(t => (
                <div key={t._id} className={styles.listItem}>
                  <div>
                    <div className={styles.itemName}>{t.teamName}</div>
                    <div className={styles.itemSub}>
                      Captain: {t.captainId?.name} • Players: {t.players.length} • Status: <span className={styles[t.status.toLowerCase()]}>{t.status}</span>
                    </div>
                  </div>
                  {isOwner && t.status === "Pending" && (
                    <div className={styles.actionsInline}>
                      <button className={styles.smallPrimary} onClick={() => onApproveTeam(t._id, "Approved")}>Approve</button>
                      <button className={styles.smallDanger} onClick={() => onApproveTeam(t._id, "Rejected")}>Reject</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Matches List */}
        <div className={`glass-card ${styles.card}`}>
          <div className={styles.cardTitle}>Championship Matches</div>
          {matches.length === 0 ? (
            <div className={styles.muted}>No matches scheduled yet.</div>
          ) : (
            <div className={styles.list}>
              {matches.map(m => (
                <div key={m._id} className={styles.listItem}>
                  <div>
                    <div className={styles.itemName}>{m.teamA.name} vs {m.teamB.name}</div>
                    <div className={styles.itemSub}>
                      Status: <span className={styles[m.status.toLowerCase()]}>{m.status}</span> • {m.oversPerInnings} Overs
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <Link to={`/match/${m._id}/${m.status === "Toss" ? "toss" : "score"}`} className={styles.smallPrimary}>
                      {m.status === "Toss" ? (isOwner ? "Perform Toss" : "Waiting for Toss") : "View Scores"}
                    </Link>
                    {isOwner && m.status !== "Completed" && m.status !== "Cancelled" && (
                       <button className={styles.smallDanger} onClick={() => onCancelMatch(m._id)}>Cancel</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
