// filepath: api/controllers/users/Login.js
import { getDb } from "../../db.js";
import yup from "yup";
import chalk from "chalk";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import analytics from "../../../utils/segment.js";
import "dotenv/config";

// Validação do schema de login
const loginSchema = yup.object().shape({
    email: yup.string().email().required(),
    password: yup.string().required(),
    remember: yup.boolean().optional(),
});

// Rota de login
export async function loginUser(req, res) {
    const { email, password, remember } = req.body;
    const db = await getDb();
    const usersCollection = db.collection("users");

    try {
        // Valida os dados recebidos
        await loginSchema.validate({ email, password, remember });

        // Busca o usuário pelo email
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Credenciais inválidas" });
        }

        // Verifica se o usuário está validado
        if (!user.isVerified) {
            return res.status(403).json({ message: "Conta não verificada. Verifique seu e-mail." });
        }

        // Compara a senha fornecida com a senha armazenada
        const storedPassword = user.senha_hash || user.password;
        const isPasswordValid = await bcrypt.compare(password, storedPassword);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Credenciais inválidas" });
        }

        console.log(chalk.green(`Sistema 💻 : Login bem-sucedido: ${user._id}`));

        // Adiciona rastreamento do evento
        try {
            analytics.track({
                userId: user._id.toString(),
                event: "Login Bem-Sucedido",
                properties: {
                    email: user.email,
                    cargo: user.cargo || user.role,
                    timestamp: new Date().toISOString(),
                },
            });
        } catch (e) {
            console.log(chalk.yellow("Segment tracker error ignored in dev"));
        }

        const isRemember = remember === true || remember === "true";

        // Gerar o token JWT
        const token = jwt.sign(
            { id: user._id.toString(), email: user.email, role: user.role || user.cargo },
            process.env.JWT_SECRET || "insira_uma_chave_aleatoria_longa_e_segura_aqui",
            { expiresIn: isRemember ? "30d" : "1d" }
        );

        // Injetar o token JWT diretamente em um Cookie HttpOnly
        const cookieConfig = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            domain: process.env.COOKIE_DOMAIN || undefined,
        };

        if (isRemember) {
            cookieConfig.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias se 'Manter sessão ativa'
        }

        res.cookie("token", token, cookieConfig);

        // NÃO retornar o token no corpo do JSON
        return res.status(200).json({
            message: "Login bem-sucedido ✅",
            userId: user._id,
            cargo: user.cargo || user.role,
            name: user.name || user.nome || "Nome não disponível",
        });
    } catch (error) {
        console.log(chalk.red(`Sistema 💻 : Erro ao fazer login: ${error.message} ❌`));
        return res.status(500).json({ error: "Erro interno no servidor" });
    }
}