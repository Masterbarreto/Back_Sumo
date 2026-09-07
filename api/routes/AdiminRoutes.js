import express from "express";
import { authenticate } from "../middlewares/authenticate.js";
import {
  createTournament,
  getTournaments,
  getTournamentById,
  updateTournamentStatus,
  enrollTeam,
  getEnrollments,
  approveEnrollment,
  generateChaves,
  getMatches,
  getDashboardStats
} from "../controllers/tournaments/TournamentController.js";

const router = express.Router();

// Public / general dashboard stats
router.get("/dashboard-stats", getDashboardStats);

// Apply authenticate to remaining admin/tournament routes
router.use(authenticate);

router.post("/torneios", createTournament);
router.get("/torneios", getTournaments);
router.get("/torneios/:id", getTournamentById);
router.put("/torneios/:id/status", updateTournamentStatus);

// Enrollments
router.post("/inscricoes", enrollTeam);
router.get("/inscricoes/:tournamentId", getEnrollments);
router.put("/inscricoes/:id/status", approveEnrollment);

// Bracket generator
router.post("/chaveamento/gerar", generateChaves);
router.get("/torneios/:tournamentId/partidas", getMatches);

export default router;
