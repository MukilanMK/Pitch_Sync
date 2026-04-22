import { createContext, useEffect, useState } from "react";

export const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("pitchsync-theme") || "night";
  });

  useEffect(() => {
    localStorage.setItem("pitchsync-theme", theme);
    if (theme === "day") {
      document.body.classList.add("theme-day");
      document.body.classList.remove("theme-night");
    } else {
      document.body.classList.add("theme-night");
      document.body.classList.remove("theme-day");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "night" ? "day" : "night"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
