import express from "express";
import { enviarEmailConfirmacao } from "../controllers/Emailer/authControlerr.js";

const router = express.Router();

// Exemplo de rota POST para enviar e-mail de confirmação
router.post("/confirmar-email", enviarEmailConfirmacao);

export default router;