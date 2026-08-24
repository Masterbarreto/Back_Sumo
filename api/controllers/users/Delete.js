// filepath: d:\Projeto de Aulas\api Mongo\api\controllers\users\Delete.js
import { ObjectId } from "mongodb";
import { getDb } from "../../db.js"; 
import chalk from "chalk";

export async function deleteUser(req, res) {
    const { id } = req.params;
    const db = await getDb();
    const professoresCollection = db.collection("professores");
    
    try {
        const result = await professoresCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }
        return res.status(200).json({ message: "Usuário deletado com sucesso" });
    } catch (error) {
        console.error("Erro ao deletar usuário:", error);
        return res.status(500).json({ error: "Erro interno no servidor" });
    }
}