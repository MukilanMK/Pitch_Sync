import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/useAuth";
import { Link } from "react-router-dom";
import { bookingService } from "../../services/bookingService";
import { turfService } from "../../services/turfService";
import { championshipService } from "../../services/championshipService";
import styles from "./OwnerDashboard.module.css";

export const OwnerDashboard = () => {
  const { token, user } = useAuth();
  const [turfs, setTurfs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [championships, setChampionships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [pricePerHour, setPricePerHour] = useState(800);
  const [facilities, setFacilities] = useState("Floodlights, Nets, Parking");

  const [quickTurfId, setQuickTurfId] = useState("");
  const [quickDate, setQuickDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [quickTimeSlot, setQuickTimeSlot] = useState("18:00-19:00");
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");

  const [champName, setChampName] = useState("");
  const [champTurfId, setChampTurfId] = useState("");
  const [champStartDate, setChampStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [champEndDate, setChampEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [champEntryFee, setChampEntryFee] = useState(0);
  const [champPrize, setChampPrize] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [turfData, bookingData, champData] = await Promise.all([
        turfService.listMine(token), 
        bookingService.listOwner(token),
        championshipService.listOwner(token)
      ]);
      const myTurfs = turfData.turfs || [];
      setTurfs(myTurfs);
      setBookings(bookingData.bookings || []);
      setChampionships(champData.championships || []);
      setQuickTurfId((prev) => prev || myTurfs?.[0]?._id || "");
      setChampTurfId((prev) => prev || myTurfs?.[0]?._id || "");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load your turfs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const facilityArr = facilities
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

      await turfService.create(token, {
        name,
        location,
        pricePerHour: Number(pricePerHour),
        facilities: facilityArr,
      });

      setSuccess("Turf created.");
      setName("");
      setLocation("");
      setFacilities("Floodlights, Nets, Parking");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create turf");
    }
  };

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

  const onCreateChamp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (!champTurfId) {
        setError("Select a turf first.");
        return;
      }
      await championshipService.create(token, {
        name: champName,
        turfId: champTurfId,
        startDate: champStartDate,
        endDate: champEndDate,
        entryFee: Number(champEntryFee),
        prize: champPrize,
      });
      setSuccess("Championship created.");
      setChampName("");
      setChampPrize("");
      setChampEntryFee(0);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create championship");
    }
  };

  return (
    <section>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Owner Dashboard</h2>
          <p className={styles.sub}>Welcome, {user?.name}. Post new turfs and manage your listings.</p>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Create Turf</div>
          {error ? <div className={styles.error}>{error}</div> : null}
          {success ? <div className={styles.success}>{success}</div> : null}

          <form className={styles.form} onSubmit={onCreate}>
            <div className={styles.row}>
              <div className={styles.label}>Name</div>
              <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Location</div>
              <input className={styles.input} value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Price per hour (₹)</div>
              <input
                className={styles.input}
                type="number"
                value={pricePerHour}
                onChange={(e) => setPricePerHour(e.target.value)}
              />
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Facilities (comma separated)</div>
              <input className={styles.input} value={facilities} onChange={(e) => setFacilities(e.target.value)} />
            </div>

            <button className={styles.primary}>Publish turf</button>
          </form>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>Organize Championship</div>
          <form className={styles.form} onSubmit={onCreateChamp}>
            <div className={styles.row}>
              <div className={styles.label}>Name</div>
              <input className={styles.input} value={champName} onChange={(e) => setChampName(e.target.value)} required />
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Turf</div>
              <select className={styles.input} value={champTurfId} onChange={(e) => setChampTurfId(e.target.value)} required>
                {turfs.map((t) => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className={styles.row2}>
              <div className={styles.row}>
                <div className={styles.label}>Start Date</div>
                <input className={styles.input} type="date" value={champStartDate} onChange={(e) => setChampStartDate(e.target.value)} required />
              </div>
              <div className={styles.row}>
                <div className={styles.label}>End Date</div>
                <input className={styles.input} type="date" value={champEndDate} onChange={(e) => setChampEndDate(e.target.value)} required />
              </div>
            </div>
            <div className={styles.row2}>
              <div className={styles.row}>
                <div className={styles.label}>Entry Fee (₹)</div>
                <input className={styles.input} type="number" value={champEntryFee} onChange={(e) => setChampEntryFee(e.target.value)} required />
              </div>
              <div className={styles.row}>
                <div className={styles.label}>Prize</div>
                <input className={styles.input} value={champPrize} onChange={(e) => setChampPrize(e.target.value)} />
              </div>
            </div>
            <button className={styles.primary}>Create Championship</button>
          </form>
        </div>

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
          <div className={styles.cardTitle}>My Championships</div>
          {loading ? <div className={styles.muted}>Loading…</div> : null}
          <div className={styles.list}>
            {championships.map((c) => (
              <div key={c._id} className={styles.listItem}>
                <div>
                  <div className={styles.itemName}>{c.name}</div>
                  <div className={styles.itemSub}>{c.turfId?.name} • {c.status}</div>
                </div>
                <Link to={`/championships/${c._id}`} className={styles.smallPrimary}>
                  Manage
                </Link>
              </div>
            ))}
            {!loading && championships.length === 0 ? <div className={styles.muted}>No championships yet.</div> : null}
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
          <div className={styles.cardTitle}>Bookings (my turfs)</div>
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
    </section>
  );
};

