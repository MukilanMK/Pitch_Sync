import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/useAuth";
import { bookingService } from "../../services/bookingService";
import { turfService } from "../../services/turfService";
import styles from "./OwnerDashboard.module.css";

export const OwnerTurfs = () => {
  const { token } = useAuth();
  const [turfs, setTurfs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [quickTurfId, setQuickTurfId] = useState("");
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quickTimeSlot, setQuickTimeSlot] = useState("18:00-19:00");
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [turfData, bookingData] = await Promise.all([
        turfService.listMine(token), 
        bookingService.listOwner(token)
      ]);
      const myTurfs = turfData.turfs || [];
      setTurfs(myTurfs);
      setBookings(bookingData.bookings || []);
      setQuickTurfId((prev) => prev || myTurfs?.[0]?._id || "");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load turfs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = async (bookingId, status) => {
    setError("");
    setSuccess("");
    try {
      await bookingService.ownerSetStatus(token, bookingId, status);
      setSuccess(`Booking ${status.toLowerCase()}.`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update booking");
    }
  };

  const quickBook = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (!quickTurfId) {
        setError("Select a turf first.");
        return;
      }
      await bookingService.ownerCreate(token, {
        turfId: quickTurfId,
        date: quickDate,
        timeSlot: quickTimeSlot,
        bookedForName: quickName,
        bookedForPhone: quickPhone,
      });
      setSuccess("Walk-in booking created (confirmed).");
      setQuickName("");
      setQuickPhone("");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create booking");
    }
  };

  return (
    <>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>My Turfs</div>
          {loading ? <div className={styles.muted}>Loading…</div> : null}
          <div className={styles.list}>
            {turfs.map((t) => (
              <div key={t._id} className={styles.listItem}>
                <div>
                  <div className={styles.itemName}>{t.name}</div>
                  <div className={styles.itemSub}>{t.location}</div>
                </div>
                <div className={styles.itemPrice}>₹{t.pricePerHour}/hr</div>
              </div>
            ))}
            {!loading && turfs.length === 0 ? <div className={styles.muted}>No turfs yet.</div> : null}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Quick book (walk-in)</div>
          <form className={styles.form} onSubmit={quickBook}>
            <div className={styles.row}>
              <div className={styles.label}>Turf</div>
              <select className={styles.input} value={quickTurfId} onChange={(e) => setQuickTurfId(e.target.value)}>
                {turfs.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Date</div>
              <input className={styles.input} type="date" value={quickDate} onChange={(e) => setQuickDate(e.target.value)} />
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Time slot</div>
              <input
                className={styles.input}
                value={quickTimeSlot}
                onChange={(e) => setQuickTimeSlot(e.target.value)}
                placeholder="18:00-19:00"
              />
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Customer name (optional)</div>
              <input className={styles.input} value={quickName} onChange={(e) => setQuickName(e.target.value)} />
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Customer phone (optional)</div>
              <input className={styles.input} value={quickPhone} onChange={(e) => setQuickPhone(e.target.value)} />
            </div>
            <button className={styles.primary}>Confirm booking</button>
          </form>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Turf Bookings</div>
          {loading ? <div className={styles.muted}>Loading…</div> : null}
          <div className={styles.list}>
            {bookings.map((b) => {
              const who = b?.playerId?.name || b?.bookedForName || "Walk-in";
              return (
                <div key={b._id} className={styles.listItem}>
                  <div>
                    <div className={styles.itemName}>{b?.turfId?.name || "Turf"}</div>
                    <div className={styles.itemSub}>
                      {b.date} • {b.timeSlot} • {who} • <span className={styles.status}>{b.status}</span>
                    </div>
                  </div>
                  <div className={styles.actionsInline}>
                    {b.status === "Pending" ? (
                      <>
                        <button className={styles.smallPrimary} onClick={() => setStatus(b._id, "Confirmed")}>
                          Approve
                        </button>
                        <button className={styles.smallDanger} onClick={() => setStatus(b._id, "Cancelled")}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button className={styles.smallGhost} onClick={() => setStatus(b._id, "Cancelled")} disabled={b.status === "Cancelled"}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {!loading && bookings.length === 0 ? <div className={styles.muted}>No bookings yet.</div> : null}
          </div>
        </div>
      </div>
    </>
  );
};
