import { useState } from "react";
import { MapPin, IndianRupee, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./TurfCard.module.css";

export const TurfCard = ({ turf, rightSlot }) => {
  const [imgIdx, setImgIdx] = useState(0);
  const images = turf?.images || [];

  const nextImg = (e) => {
    e.stopPropagation();
    setImgIdx((prev) => (prev + 1) % images.length);
  };

  const prevImg = (e) => {
    e.stopPropagation();
    setImgIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className={`glass-card ${styles.card}`}>
      <div className={styles.carouselWrap}>
        {images.length > 0 ? (
          <>
            <img src={images[imgIdx]} alt={turf?.name} className={styles.image} />
            {images.length > 1 && (
              <>
                <div className={styles.controls}>
                  <button type="button" className={styles.arrow} onClick={prevImg}>
                    <ChevronLeft size={20} />
                  </button>
                  <button type="button" className={styles.arrow} onClick={nextImg}>
                    <ChevronRight size={20} />
                  </button>
                </div>
                <div className={styles.dots}>
                  {images.map((_, i) => (
                    <div key={i} className={`${styles.dot} ${i === imgIdx ? styles.active : ""}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className={styles.placeholder}>PitchSync</div>
        )}
      </div>

      <div className={styles.top}>
        <div>
          <div className={styles.name}>{turf?.name}</div>
          <div className={styles.location}>
            <MapPin size={14} className={styles.icon} />
            {turf?.location}
          </div>
        </div>
        <div className={styles.price}>
          <IndianRupee size={14} className={styles.icon} />
          {turf?.pricePerHour}/hr
        </div>
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

