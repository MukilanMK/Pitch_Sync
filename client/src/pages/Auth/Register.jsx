import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import styles from "./AuthCard.module.css";

export const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Player");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await register({ name, userId, email, password, role });
      if (user?.role === "Owner") navigate("/owner", { replace: true });
      else navigate("/player", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.wrap}>
      <div className={styles.card}>
        <h2 className={styles.title}>Create your PitchSync account</h2>
        <p className={styles.sub}>Choose your role — Owner (provider) or Player (consumer).</p>

        {error ? <div className={styles.error}>{error}</div> : null}

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.row}>
            <div className={styles.label}>Full name</div>
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className={styles.row}>
            <div className={styles.label}>User ID</div>
            <input
              className={styles.input}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g. rohit_07"
            />
          </div>
          <div className={styles.row}>
            <div className={styles.label}>Email</div>
            <input className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className={styles.row}>
            <div className={styles.label}>Password</div>
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className={styles.row}>
            <div className={styles.label}>Role</div>
            <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="Player">Player</option>
              <option value="Owner">Owner</option>
            </select>
          </div>

          <div className={styles.actions}>
            <button className={styles.primary} disabled={loading}>
              {loading ? "Creating…" : "Register"}
            </button>
            <Link className={styles.secondary} to="/login">
              Login
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
};

