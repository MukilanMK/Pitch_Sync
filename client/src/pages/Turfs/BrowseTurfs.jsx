import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/useAuth";
import { bookingService } from "../../services/bookingService";
import { turfService } from "../../services/turfService";
import { TurfCard } from "../../components/TurfCard/TurfCard";
import styles from "./BrowseTurfs.module.css";

const buildHourlySlots = ({ startHour = 6, endHour = 23 } = {}) => {
  const pad = (n) => String(n).padStart(2, "0");
  const slots = [];
  for (let h = startHour; h < endHour; h += 1) {
    slots.push(`${pad(h)}:00-${pad(h + 1)}:00`);
  }
  return slots;
};

export const BrowseTurfs = () => {
  const { token, user, isAuthenticated } = useAuth();
  const [turfs, setTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bookingMsg, setBookingMsg] = useState("");

  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const slots = buildHourlySlots({ startHour: 6, endHour: 23 });
  const [timeSlot, setTimeSlot] = useState("18:00-19:00");

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const isOwner = isAuthenticated && user?.role === "Owner";
        const data = isOwner ? await turfService.listMine(token) : await turfService.list();
        if (mounted) setTurfs(data.turfs || []);
      } catch (err) {
        if (mounted) setError(err?.response?.data?.message || "Failed to load turfs");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, token, user?.role]);

  const isOwner = isAuthenticated && user?.role === "Owner";
  const canBook = isAuthenticated && user?.role === "Player";

  const book = async (turfId) => {
    setBookingMsg("");
    setError("");
    try {
      const { booking } = await bookingService.create(token, { turfId, date, timeSlot });
      setBookingMsg(`Booked: ${booking.date} ${booking.timeSlot} (status: ${booking.status})`);
    } catch (err) {
      setError(err?.response?.data?.message || "Booking failed");
    }
  };

  return (
    <section>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Browse Turfs</h2>
          <p className={styles.sub}>
            {isOwner ? "Your turfs (owner view). Manage bookings in Owner Dashboard." : "Pick a slot and reserve instantly."}
          </p>
        </div>

        {canBook ? (
          <div className={styles.slot}>
            <div className={styles.slotLabel}>Slot</div>
            <input className={styles.input} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <select className={styles.input} value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
              {slots.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className={styles.notice}>
            {isOwner ? "Owner accounts don’t book from this page." : isAuthenticated ? "Login as Player to book." : "Login to book a turf."}
          </div>
        )}
      </div>

      {bookingMsg ? <div className={styles.success}>{bookingMsg}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}

      {loading ? <div className={styles.muted}>Loading turfs…</div> : null}

      <div className={styles.grid}>
        {turfs.map((t) => (
          <TurfCard
            key={t._id}
            turf={t}
            rightSlot={
              canBook ? (
                <button className={styles.bookBtn} onClick={() => book(t._id)}>
                  Book this slot
                </button>
              ) : null
            }
          />
        ))}
      </div>
    </section>
  );
};

