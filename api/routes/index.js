const router = express.Router();

router.use("/users", userRoutes); // Fluxo do usuario 
router.use("/email", emailRoutes); // Fluxo de envio de e-mail
router.use("/Rouds", RoudsRoutes); // Fluxo da criação dos rouds 
router.use("/Equipes", EquipesRoutes); // Fluxo de gerenciamento de equipes
router.use("/adm",AdiminRoutes); // Fluxo do adiministrativo 

// Rotas diretas para redefinição de senha
router.post("/reset-password", resetPassword);
router.post("/request-password-reset", requestPasswordReset);

export default router;