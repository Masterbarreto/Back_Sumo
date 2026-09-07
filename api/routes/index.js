import express from "express";
import userRoutes from "./users.js";
import emailRoutes from "./EmailRoutes.js";
import RoudsRoutes from "./RoudsRoutes.js";
import EquipesRoutes from "./EquipesRoutes.js";
import AdiminRoutes from "./AdiminRoutes.js";
import arenaRoutes from "./ArenaRoutes.js";
import certificateRoutes from "./CertificateRoutes.js";
import partidasRoutes from "./PartidasRoutes.js";

const router = express.Router();

router.use("/users", userRoutes); // Fluxo do usuario
router.use("/email", emailRoutes); // Fluxo de envio de e-mail
router.use("/Rouds", RoudsRoutes); // Fluxo da criação dos rounds
router.use("/Equipes", EquipesRoutes); // Fluxo de gerenciamento de equipes
router.use("/adm", AdiminRoutes); // Fluxo do administrativo
router.use("/arenas", arenaRoutes); // Fluxo de arenas
router.use("/adm/arenas", arenaRoutes); // Alias administrativo
router.use("/certificados", certificateRoutes); // Fluxo de certificados
router.use("/adm/certificados", certificateRoutes); // Alias administrativo
router.use("/partidas", partidasRoutes); // Fluxo de partidas com banco real
router.use("/adm/partidas", partidasRoutes); // Alias administrativo

export default router;