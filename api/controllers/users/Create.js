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
        const usersCollection = db.collection("users");

        const existingUser = await usersCollection.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "E-mail já cadastrado." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // Gerar código de validação
        const validationCode = Math.floor(100000 + Math.random() * 900000).toString();

        const result = await usersCollection.insertOne({
            email,
            password: hashedPassword, // compatibilidade
            senha_hash: hashedPassword, // especificação
            name, // compatibilidade
            nome: name, // especificação
            cargo, // compatibilidade
            role: cargo.toUpperCase(), // especificação (PROFESSOR, ALUNO)
            isVerified: false,
            validationCode,
        });

        console.log(chalk.green(`Sistema 💻 : Usuário Cadastrado com Sucesso: ${result.insertedId} ✅`));

        // Enviar e-mail com o código de validação
        try {
            const templatePath = path.resolve("public/pages/codeVrifi.html");
            let html = fs.readFileSync(templatePath, "utf-8");
            html = html.replace("{{validationCode}}", validationCode);

            await sendEmail({
                to: email,
                subject: "Código de Validação",
                html,
            });
        } catch (mailError) {
            console.error("Erro ao enviar e-mail de validação:", mailError);
            // Prossegue mesmo se falhar o e-mail em dev (ou opcionalmente retorna erro)
        }

        const responseData = {
            message: "Usuário criado com sucesso! Verifique seu e-mail para validar a conta.",
            userId: result.insertedId,
        };
        if (process.env.NODE_ENV === "development") {
            responseData.validationCode = validationCode;
        }
        return res.status(201).json(responseData);
    } catch (error) {
        console.error("Erro ao criar usuário:", error);
        return res.status(500).json({ error: "Erro interno no servidor" });
    }
};