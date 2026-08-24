import yup from "yup";
import chalk from "chalk";
import bcrypt from "bcrypt";
import { getDb } from "../../db.js";
import sendEmail from "../../../utils/emailServices.js";
import fs from "fs";
import path from "path";

export const createUser = async (req, res) => {
    const schema = yup.object().shape({
        email: yup.string().email().required(),
        password: yup.string().required(),
        name: yup.string().required(),
        cargo: yup.string().required(),
    });

    try {
        await schema.validate(req.body, { abortEarly: false });
    } catch (error) {
        return res.status(400).json({ error: error.errors });
    }

    const { email, password, name, cargo } = req.body;

    try {
        const db = await getDb();
        const professoresCollection = db.collection("professores");

        const existingUser = await professoresCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "E-mail já cadastrado." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Gerar código de validação
        const validationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const result = await professoresCollection.insertOne({
            email,
            password: hashedPassword,
            name,
            cargo,
            isVerified: false, // Adiciona o campo de verificação
            validationCode, // Salva o código de validação
        });

        console.log(chalk.green(`Sistema 💻 : Professor Cadastrado com Sucesso: ${result.insertedId} ✅`));

        // Caminho para o arquivo HTML
        const templatePath = path.resolve("public/pages/codeVrifi.html");
        let html = fs.readFileSync(templatePath, "utf-8");

        // Substituir o placeholder {{validationCode}} pelo código gerado
        html = html.replace("{{validationCode}}", validationCode);

        // Enviar e-mail com o código de validação
        await sendEmail({
            to: email,
            subject: "Código de Validação",
            html,
        });

        return res.status(201).json({
            message: "Usuário criado com sucesso! Verifique seu e-mail para validar a conta.",
            userId: result.insertedId,
        });
    } catch (error) {
        console.error("Erro ao criar usuário:", error);
        return res.status(500).json({ error: "Erro interno no servidor" });
    }
};