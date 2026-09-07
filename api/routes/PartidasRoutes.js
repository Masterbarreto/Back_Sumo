import express from "express";
import {
  getAllPartidas,
  getPartidaById,
  toggleReleaseMatch,
  setMatchWinner,
  handleAddRound,
  releaseAllPartidas,
  hideAllPartidas,
  resetSorteio
} from "../controllers/partidas/PartidasController.js";

const router = express.Router();

// Public / General routes for matches
router.get("/", getAllPartidas);
router.get("/:id", getPartidaById);

// Release actions
router.patch("/:id/release", toggleReleaseMatch);
router.post("/:id/release", toggleReleaseMatch);
router.post("/release-all", releaseAllPartidas);
router.post("/hide-all", hideAllPartidas);

// Winner & Round actions
router.post("/:id/winner", setMatchWinner);
router.post("/:matchId/rounds", handleAddRound);

// Sorteio
router.post("/reset-sorteio", resetSorteio);

export default router;
