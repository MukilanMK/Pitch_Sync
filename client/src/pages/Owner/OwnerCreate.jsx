import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/useAuth";
import { turfService } from "../../services/turfService";
import { championshipService } from "../../services/championshipService";
import styles from "./OwnerDashboard.module.css";

export const OwnerCreate = () => {
  const { token } = useAuth();
  const [turfs, setTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Turf Form State
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [pricePerHour, setPricePerHour] = useState(800);
  const [facilities, setFacilities] = useState("Floodlights, Nets, Parking");
  const [images, setImages] = useState(null);

  // Championship Form State
  const [champName, setChampName] = useState("");
  const [champTurfId, setChampTurfId] = useState("");
  const [champStartDate, setChampStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [champEndDate, setChampEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [champEntryFee, setChampEntryFee] = useState(0);
  const [champMaxTeams, setChampMaxTeams] = useState(8);
  const [champFirstPrize, setChampFirstPrize] = useState("");
  const [champSecondPrize, setChampSecondPrize] = useState("");
  const [champThirdPrize, setChampThirdPrize] = useState("");

  const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];

  const loadTurfs = async () => {
    setLoading(true);
    try {
      const turfData = await turfService.listMine(token);
      const myTurfs = turfData.turfs || [];
      setTurfs(myTurfs);
      setChampTurfId((prev) => prev || myTurfs?.[0]?._id || "");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTurfs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreateTurf = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("location", location);
      formData.append("pricePerHour", pricePerHour);
      formData.append("facilities", facilities);
      if (images) {
        for (let i = 0; i < images.length; i++) {
          formData.append("images", images[i]);
        }
      }

      await turfService.create(token, formData);
      setSuccess("Turf created successfully.");
      setName("");
      setLocation("");
      setFacilities("Floodlights, Nets, Parking");
      setImages(null);
      await loadTurfs();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create turf");
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
      if (champMaxTeams < 2) {
        setError("Minimum 2 teams are required.");
        return;
      }
      await championshipService.create(token, {
        name: champName,
        turfId: champTurfId,
        startDate: champStartDate,
        endDate: champEndDate,
        entryFee: Number(champEntryFee),
        maxRegistrations: Number(champMaxTeams),
        firstPrize: champFirstPrize,
        secondPrize: champSecondPrize,
        thirdPrize: champThirdPrize,
      });
      setSuccess("Championship created successfully.");
      setChampName("");
      setChampFirstPrize("");
      setChampSecondPrize("");
      setChampThirdPrize("");
      setChampEntryFee(0);
      setChampMaxTeams(8);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create championship");
    }
  };

  return (
    <>
      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}
      
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Create Turf</div>
          <form className={styles.form} onSubmit={onCreateTurf}>
            <div className={styles.row}>
              <div className={styles.label}>Name</div>
              <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Location</div>
              <input className={styles.input} value={location} onChange={(e) => setLocation(e.target.value)} required />
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Price per hour (₹)</div>
              <input
                className={styles.input}
                type="number"
                value={pricePerHour}
                onChange={(e) => setPricePerHour(e.target.value)}
                required
              />
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Facilities (comma separated)</div>
              <input className={styles.input} value={facilities} onChange={(e) => setFacilities(e.target.value)} required />
            </div>
            <div className={styles.row}>
              <div className={styles.label}>Images (optional)</div>
              <input className={styles.input} type="file" multiple accept="image/*" onChange={(e) => setImages(e.target.files)} />
            </div>
            <button className={styles.primary}>Publish Turf</button>
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
                {turfs.length === 0 && <option value="">No turfs available</option>}
              </select>
            </div>
            <div className={styles.row2}>
              <div className={styles.row}>
                <div className={styles.label}>Start Date</div>
                <input className={styles.input} type="date" min={todayStr} value={champStartDate} onChange={(e) => setChampStartDate(e.target.value)} required />
              </div>
              <div className={styles.row}>
                <div className={styles.label}>End Date</div>
                <input className={styles.input} type="date" min={champStartDate || todayStr} value={champEndDate} onChange={(e) => setChampEndDate(e.target.value)} required />
              </div>
            </div>
            <div className={styles.row2}>
              <div className={styles.row}>
                <div className={styles.label}>Entry Fee (₹)</div>
                <input className={styles.input} type="number" value={champEntryFee} onChange={(e) => setChampEntryFee(e.target.value)} required />
              </div>
              <div className={styles.row}>
                <div className={styles.label}>Max Teams (Min 2)</div>
                <input className={styles.input} type="number" min="2" value={champMaxTeams} onChange={(e) => setChampMaxTeams(e.target.value)} required />
              </div>
            </div>
            <div className={styles.row}>
              <div className={styles.label}>1st Prize</div>
              <input className={styles.input} value={champFirstPrize} onChange={(e) => setChampFirstPrize(e.target.value)} />
            </div>
            <div className={styles.row2}>
              <div className={styles.row}>
                <div className={styles.label}>2nd Prize</div>
                <input className={styles.input} value={champSecondPrize} onChange={(e) => setChampSecondPrize(e.target.value)} />
              </div>
              <div className={styles.row}>
                <div className={styles.label}>3rd Prize</div>
                <input className={styles.input} value={champThirdPrize} onChange={(e) => setChampThirdPrize(e.target.value)} />
              </div>
            </div>
            <button className={styles.primary}>Create Championship</button>
          </form>
        </div>
      </div>
    </>
  );
};
