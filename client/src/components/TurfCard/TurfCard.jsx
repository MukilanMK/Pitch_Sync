import styles from "./TurfCard.module.css";

export const TurfCard = ({ turf, rightSlot }) => {
  return (
    <div className={styles.card}>
      <div className={styles.top}>
        <div>
          <div className={styles.name}>{turf?.name}</div>
          <div className={styles.location}>{turf?.location}</div>
        </div>
        <div className={styles.price}>₹{turf?.pricePerHour}/hr</div>
      </div>

      {Array.isArray(turf?.facilities) && turf.facilities.length > 0 ? (
        <div className={styles.tags}>
          {turf.facilities.slice(0, 6).map((f) => (
            <span key={f} className={styles.tag}>
              {f}
            </span>
          ))}
        </div>
      ) : (
        <div className={styles.muted}>No facilities listed.</div>
      )}

      {rightSlot ? <div className={styles.footer}>{rightSlot}</div> : null}
    </div>
  );
};

