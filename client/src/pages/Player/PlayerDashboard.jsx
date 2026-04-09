import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import { bookingService } from "../../services/bookingService";
import { friendService } from "../../services/friendService";
import { statsService } from "../../services/statsService";
import styles from "./PlayerDashboard.module.css";

export const PlayerDashboard = () => {
  const { token, user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [friends, setFriends] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [friendUserId, setFriendUserId] = useState("");
  const [friendMsg, setFriendMsg] = useState("");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const [data, friendData, statsData] = await Promise.all([
          bookingService.listMine(token),
          friendService.list(token),
          statsService.me(token).catch(() => ({ stats: null })),
        ]);
        if (mounted) setBookings(data.bookings || []);
        if (mounted) setFriends(friendData.friends || []);
        if (mounted) setStats(statsData.stats || null);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.message || "Failed to load bookings");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [token]);

  const addFriend = async (e) => {
    e.preventDefault();
    setError("");
    setFriendMsg("");
    try {
      const { friend } = await friendService.addByUserId(token, friendUserId);
      setFriendMsg(`Added: ${friend?.name} (@${friend?.userId})`);
      setFriendUserId("");
      const friendData = await friendService.list(token);
      setFriends(friendData.friends || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to add friend");
    }
  };

  const removeFriend = async (friendId) => {
    setError("");
    setFriendMsg("");
    try {
      await friendService.remove(token, friendId);
      const friendData = await friendService.list(token);
      setFriends(friendData.friends || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to remove friend");
    }
  };

  return (
    <section>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Player Dashboard</h2>
          <p className={styles.sub}>
            Welcome, {user?.name} <span className={styles.pill}>@{user?.userId || "no-userId"}</span>
          </p>
        </div>
        <div className={styles.actions}>
          <Link className={styles.secondary} to="/turfs">
            Book a turf
          </Link>
          <Link className={styles.primary} to="/match/new">
            Start match
          </Link>
        </div>
      </div>

      {error ? <div className={styles.error}>{error}</div> : null}
      {loading ? <div className={styles.muted}>Loading…</div> : null}

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>My Statistics</div>
          {stats ? (
            <div className={styles.list}>
              <div className={styles.item}>
                <div>
                  <div className={styles.itemTitle}>Batting</div>
                  <div className={styles.itemSub}>
                    Runs: {stats.batting.runs} • Balls: {stats.batting.balls} • SR: {stats.batting.strikeRate} • 4s:{" "}
                    {stats.batting.fours} • 6s: {stats.batting.sixes}
                  </div>
                </div>
                <span className={styles.pill}>Matches: {stats.matches}</span>
              </div>
              <div className={styles.item}>
                <div>
                  <div className={styles.itemTitle}>Bowling</div>
                  <div className={styles.itemSub}>
                    Wickets: {stats.bowling.wickets} • Runs: {stats.bowling.runsConceded} • Econ: {stats.bowling.economy} •
                    Wd: {stats.bowling.wides} • Nb: {stats.bowling.noBalls}
                  </div>
                </div>
                <span className={styles.pill}>Balls: {stats.bowling.balls}</span>
              </div>
            </div>
          ) : (
            <div className={styles.muted}>No match stats yet. Start a match to begin tracking.</div>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Friends</div>
          {friendMsg ? <div className={styles.muted}>{friendMsg}</div> : null}
          <form onSubmit={addFriend}>
            <div className={styles.row}>
              <div className={styles.label}>Add by User ID</div>
              <div className={styles.btnRow}>
                <input
                  className={styles.input}
                  placeholder="e.g. rohit_07"
                  value={friendUserId}
                  onChange={(e) => setFriendUserId(e.target.value)}
                />
                <button className={styles.smallBtn}>Add</button>
              </div>
            </div>
          </form>
          <div className={styles.list}>
            {friends.map((f) => (
              <div key={f._id} className={styles.item}>
                <div>
                  <div className={styles.itemTitle}>
                    {f.name} <span className={styles.pill}>@{f.userId}</span>
                  </div>
                  <div className={styles.itemSub}>{f.email}</div>
                </div>
                <button className={styles.dangerBtn} onClick={() => removeFriend(f._id)}>
                  Remove
                </button>
              </div>
            ))}
            {!loading && friends.length === 0 ? <div className={styles.muted}>No friends yet.</div> : null}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>My Bookings</div>
          <div className={styles.list}>
            {bookings.map((b) => (
              <div key={b._id} className={styles.item}>
                <div>
                  <div className={styles.itemTitle}>{b?.turfId?.name || "Turf"}</div>
                  <div className={styles.itemSub}>
                    {b.date} • {b.timeSlot} • <span className={styles.status}>{b.status}</span>
                  </div>
                </div>
                <Link className={styles.scoreBtn} to={`/scorecard/${b._id}`}>
                  Live scorecard
                </Link>
              </div>
            ))}
            {!loading && bookings.length === 0 ? (
              <div className={styles.muted}>No bookings yet. Book a turf to start a match.</div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

