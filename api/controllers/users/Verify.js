import { getDb } from "../../db.js";

export const verifyUser = async (req, res) => {
    const { email, code  } = req.body;

    try {
        const db = await getDb();
        const professoresCollection = db.collection("professores");

        const user = await professoresCollection.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        if (user.isVerified) {
            return res.status(400).json({ error: "Usuário já verificado." });
        }

        if (user.validationCode !== code) {
            return res.status(400).json({ error: "Código de validação inválido." });
        }

        await professoresCollection.updateOne(
            { email },
            { $set: { isVerified: true }, $unset: { validationCode: "" } }
        );

        return res.status(200).json({ message: "Conta verificada com sucesso!" });
    } catch (error) {
        console.error("Erro ao verificar usuário:", error);
        return res.status(500).json({ error: "Erro interno no servidor" });
    }
};