import { Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AppLayout } from "../layouts/AppLayout";
import { Landing } from "../pages/Landing/Landing";
import { Login } from "../pages/Auth/Login";
import { Register } from "../pages/Auth/Register";
import { BrowseTurfs } from "../pages/Turfs/BrowseTurfs";
import { OwnerLayout } from "../pages/Owner/OwnerLayout";
import { OwnerTurfs } from "../pages/Owner/OwnerTurfs";
import { OwnerChampionships } from "../pages/Owner/OwnerChampionships";
import { OwnerCreate } from "../pages/Owner/OwnerCreate";
import { PlayerDashboard } from "../pages/Player/PlayerDashboard";
import { ScorecardPage } from "../pages/Scorecard/ScorecardPage";
import { MatchDrafter } from "../pages/MatchDrafter/MatchDrafter";
import { MatchWizard } from "../pages/Match/MatchWizard";
import { MatchToss } from "../pages/Match/MatchToss";
import { MatchScore } from "../pages/Match/MatchScore";
import { ChampionshipList } from "../pages/Championships/ChampionshipList";
import { ChampionshipDetails } from "../pages/Championships/ChampionshipDetails";

export const AppRouter = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/turfs" element={<BrowseTurfs />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/championships" element={<ChampionshipList />} />
          <Route path="/championships/:id" element={<ChampionshipDetails />} />
        </Route>

        <Route element={<ProtectedRoute allowRoles={["Owner"]} />}>
          <Route path="/owner" element={<OwnerLayout />}>
            <Route index element={<OwnerTurfs />} />
            <Route path="turfs" element={<OwnerTurfs />} />
            <Route path="championships" element={<OwnerChampionships />} />
            <Route path="create" element={<OwnerCreate />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowRoles={["Player"]} />}>
          <Route path="/player" element={<PlayerDashboard />} />
          <Route path="/match-drafter" element={<MatchDrafter />} />
          <Route path="/scorecard/:bookingId" element={<ScorecardPage />} />
          <Route path="/match/new" element={<MatchWizard />} />
        </Route>

        <Route element={<ProtectedRoute allowRoles={["Player", "Owner"]} />}>
          <Route path="/match/:id/toss" element={<MatchToss />} />
          <Route path="/match/:id/score" element={<MatchScore />} />
        </Route>

        <Route path="*" element={<Landing />} />
      </Route>
    </Routes>
  );
};

