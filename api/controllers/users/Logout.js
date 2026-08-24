// filepath: d:\Projeto de Aulas\api Mongo\api\controllers\users\Logout.js
import { getDb } from "../../db.js";
import { ObjectId } from "mongodb";
import chalk from "chalk";

async function logoutUser(req, res) {
    const { id } = req.params;
    const db = await getDb();
    const sessionCollection = db.collection("sessions"); 
    try {
        const result = await sessionCollection.deleteOne({ userId: new ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Sessão não encontrada" });
        }
        return res.status(200).json({ message: "Sessão encerrada com sucesso" });
    }
    catch (error) {
        console.error("Erro ao encerrar sessão:", error);
        return res.status(500).json({ error: "Erro interno no servidor" });
    }
}

export { logoutUser };