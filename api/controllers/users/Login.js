// filepath: api-mongo/api/controllers/users/Login.js
import { getDb } from "../../db.js";
import yup from "yup";
import chalk from "chalk";
import bcrypt from "bcrypt";
import analytics from "../../../utils/segment.js";

// Validação do schema de login
const loginSchema = yup.object().shape({
    email: yup.string().email().required(),
    password: yup.string().required(),
});

// Rota de login
export async function loginUser(req, res) {
    const { email, password, isVerified } = req.body;
    const db = await getDb();
    const professoresCollection = db.collection("professores");

    try {
        // Valida os dados recebidos
        await loginSchema.validate({ email, password, isVerified });

        // Busca o usuário pelo email
        const user = await professoresCollection.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Credenciais inválidas" });
        }

        // Verifica se o usuário está validado
        if (!user.isVerified) {
            return res.status(403).json({ message: "Conta não verificada. Verifique seu e-mail." });
        }

        // Compara a senha fornecida com a senha armazenada
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Credenciais inválidas" });
        }

        console.log(chalk.green(`Sistema 💻 : Login bem-sucedido: ${user._id}`));

        // Adiciona rastreamento do evento
        analytics.track({
            userId: user._id.toString(),
            event: "Login Bem-Sucedido",
            properties: {
                email: user.email,
                cargo: user.cargo,
                timestamp: new Date().toISOString(),
            },
        });

        return res.status(200).json({
            message: "Login bem-sucedido ✅",
            userId: user._id,
            cargo: user.cargo,
            name: user.name || "Nome não disponível", // Inclui o nome do usuário na resposta
        });
    } catch (error) {
        console.log(chalk.red(`Sistema 💻 : Erro ao fazer login: ${error.message} ❌`));
        return res.status(500).json({ error: "Erro interno no servidor" });
    }
}