import { useEffect } from "react";
import { AppRouter } from "./router/AppRouter";

const App = () => {
  useEffect(() => {
    const handleMouseMove = (e) => {
      // Find all elements we want to apply the spotlight effect to
      const cards = document.querySelectorAll('.glass-card, [class*="_card_"], [class*="_item_"], [class*="_notificationCard_"]');
      for (const card of cards) {
        // Skip title and wrap elements to avoid weird glowing on text blocks
        if (card.className.includes("Title") || card.className.includes("Sub") || card.className.includes("Wrap")) continue;
        
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty("--mouse-x", `${x}px`);
        card.style.setProperty("--mouse-y", `${y}px`);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return <AppRouter />;
};

export default App;
