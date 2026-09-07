import express from "express";
import { authenticate } from "../middlewares/authenticate.js";
import {
  getMatchById,
  addRound
} from "../controllers/tournaments/TournamentController.js";
import {
  handleAddRound,
  getPartidaById
} from "../controllers/partidas/PartidasController.js";

const router = express.Router();

router.use(authenticate);

router.get("/partidas/:id", getPartidaById || getMatchById);
router.post("/partidas/:matchId/rounds", handleAddRound || addRound);

export default router;
