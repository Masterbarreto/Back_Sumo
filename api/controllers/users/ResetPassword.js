// filepath: api-mongo/api/controllers/users/ResetPassword.js
import { getDb } from "../../db.js";
import bcrypt from "bcrypt";
import chalk from "chalk";

async function ResetPassWord(req, res) {
    const { email, code, newPassword } = req.body;

    try {
        const db = await getDb();
        const usersCollection = db.collection("professores");

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
            { $set: { password: hashedPassword }, $unset: { resetCode: "" } }
        );

        console.log(chalk.green(`Sistema 💻 : Senha atualizada com sucesso para o usuário: ${email}`));
        return res.status(200).json({ message: "Senha redefinida com sucesso!" });
    } catch (error) {
        console.error("Sistema 💻 : Erro ao redefinir a senha:", error);
        return res.status(500).json({ error: "Erro interno no servidor." });
    }
}

export { ResetPassWord };