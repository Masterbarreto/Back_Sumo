// filepath: api/controllers/users/Logout.js
import { getDb } from "../../db.js";
import { ObjectId } from "mongodb";
import chalk from "chalk";

async function logoutUser(req, res) {
    const { id } = req.params;
    const db = await getDb();
    const sessionCollection = db.collection("sessions");
    try {
        if (id && ObjectId.isValid(id)) {
            await sessionCollection.deleteOne({ userId: new ObjectId(id) });
        }
        
        // Limpar o cookie de autenticação
        const isProd = process.env.NODE_ENV === "production";
        res.clearCookie("token", {
            httpOnly: true,
            secure: isProd,
            sameSite: isProd ? "none" : "lax",
            domain: isProd ? undefined : (process.env.COOKIE_DOMAIN || undefined),
        });

        return res.status(200).json({ message: "Sessão encerrada com sucesso" });
    }
    catch (error) {
        console.error("Erro ao encerrar sessão:", error);
        return res.status(500).json({ error: "Erro interno no servidor" });
    }
}

export { logoutUser };