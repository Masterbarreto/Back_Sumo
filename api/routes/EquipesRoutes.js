import express from "express";
import { authenticate } from "../middlewares/authenticate.js";
import {
  createTeam,
  joinTeam,
  getTeams,
  getTeamById,
  updateTeamStatus,
  addMember,
  removeMember,
  updateMemberDocStatus
} from "../controllers/Equipes/TeamController.js";

const router = express.Router();

// Public read routes
router.get("/", getTeams);
router.get("/:id", getTeamById);

// Apply authenticate to write/mutation routes
router.use(authenticate);

router.post("/", createTeam);
router.post("/join", joinTeam);
router.put("/:id/status", updateTeamStatus);

// Members routes
router.post("/:id/membros", addMember);
router.delete("/:id/membros/:cpf", removeMember);
router.put("/:id/membros/:cpf/doc-status", updateMemberDocStatus);

export default router;
