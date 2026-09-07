import express from "express";
import {
  getArenas,
  getArenaById,
  createArena,
  updateArena,
  deleteArena,
  updateArenaTeams,
} from "../controllers/Arenas/ArenaController.js";

const router = express.Router();

// Public routes for arenas (read & write for admin dashboard)
router.get("/", getArenas);
router.get("/:id", getArenaById);
router.post("/", createArena);
router.put("/:id", updateArena);
router.delete("/:id", deleteArena);
router.put("/:id/teams", updateArenaTeams);

export default router;
