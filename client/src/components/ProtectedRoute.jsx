import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

export const ProtectedRoute = ({ allowRoles }) => {
  const { isBootstrapping, isAuthenticated, user } = useAuth();

  if (isBootstrapping) {
    return (
      <div style={{ padding: 24, color: "rgba(226,232,240,0.85)" }}>
        Loading PitchSync…
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (Array.isArray(allowRoles) && allowRoles.length > 0 && !allowRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

