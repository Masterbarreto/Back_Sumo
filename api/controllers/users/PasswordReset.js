import { getDb } from "../../db.js";
import sendEmail from "../../../utils/emailServices.js";
import bcrypt from "bcrypt";

export const requestPasswordReset = async (req, res) => {
    const { email } = req.body;

    try {
        const db = await getDb();
        const usersCollection = db.collection("users");

        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        // Gerar código de redefinição
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

        await usersCollection.updateOne({ email }, { $set: { resetCode } });

        // Enviar e-mail com o código de redefinição
        try {
            await sendEmail({
                to: email,
                subject: "Redefinição de Senha",
                html: `<p>Olá, ${user.name || user.nome}!</p><p>Seu código de redefinição de senha é: <strong>${resetCode}</strong></p>`,
            });
        } catch (mailError) {
            console.error("Erro ao enviar e-mail de redefinição:", mailError);
        }

        return res.status(200).json({ message: "E-mail de redefinição enviado com sucesso!" });
    } catch (error) {
        console.error("Erro ao solicitar redefinição de senha:", error);
        return res.status(500).json({ error: "Erro interno no servidor" });
    }
};

export const resetPassword = async (req, res) => {
    const { email, code, newPassword } = req.body;

    try {
        const db = await getDb();
        const usersCollection = db.collection("users");

        // Verifica se o usuário existe
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        // Verifica se o código de redefinição é válido
        if (user.resetCode !== code) {
            return res.status(400).json({ error: "Código de redefinição inválido." });
        }

        // Atualiza a senha do usuário
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await usersCollection.updateOne(
            { email },
            { $set: { password: hashedPassword, senha_hash: hashedPassword }, $unset: { resetCode: "" } }
        );

        return res.status(200).json({ message: "Senha redefinida com sucesso!" });
    } catch (error) {
        console.error("Erro ao redefinir senha:", error);
        return res.status(500).json({ error: "Erro interno no servidor." });
    }
};