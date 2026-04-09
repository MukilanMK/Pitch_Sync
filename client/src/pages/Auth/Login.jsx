import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import styles from "./AuthCard.module.css";

export const Login = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user: u } = await login({ email, password });
      if ((u || user)?.role === "Owner") navigate("/owner", { replace: true });
      else navigate("/player", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.wrap}>
      <div className={styles.card}>
        <h2 className={styles.title}>Welcome back</h2>
        <p className={styles.sub}>Login to manage turfs or book your next match.</p>

        {error ? <div className={styles.error}>{error}</div> : null}

        <form className={styles.form} onSubmit={onSubmit}>
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

          <div className={styles.actions}>
            <button className={styles.primary} disabled={loading}>
              {loading ? "Signing in…" : "Login"}
            </button>
            <Link className={styles.secondary} to="/register">
              Register
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
};

