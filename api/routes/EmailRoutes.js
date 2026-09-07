import express from "express";
import { enviarEmailConfirmacao } from "../controllers/emailer/Emailer.js";

const router = express.Router();

// Rota POST para enviar e-mail de confirmação
router.post("/confirmar-email", enviarEmailConfirmacao);

export default router;