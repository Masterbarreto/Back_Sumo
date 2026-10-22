import yup from "yup";
import chalk from "chalk";
import bcrypt from "bcrypt";
import { getDb } from "../../db.js";
import sendEmail from "../../../utils/emailServices.js";
import fs from "fs";
import path from "path";

export const createUser = async (req, res) => {
    const isLgpdAccepted = req.body.lgpdAccepted === true || req.body.lgpdAccepted === "true" || req.body.lgpdConsent === true;

    const schema = yup.object().shape({
        email: yup.string().email("Formato de e-mail inválido").required("E-mail é obrigatório"),
        password: yup.string().required("Senha é obrigatória"),
        name: yup.string().required("Nome é obrigatório"),
        cargo: yup.string().required("Cargo é obrigatório"),
        lgpdAccepted: yup.boolean().oneOf([true], "É obrigatório aceitar os termos da LGPD para criar uma conta.").required("É obrigatório aceitar os termos da LGPD para criar uma conta."),
    });

    try {
        await schema.validate({ ...req.body, lgpdAccepted: isLgpdAccepted }, { abortEarly: false });
    } catch (error) {
        return res.status(400).json({ 
            error: error.errors && error.errors.length > 0 ? error.errors[0] : "Dados inválidos.",
            details: error.errors 
        });
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

        const lgpdAcceptedAt = req.body.lgpdAcceptedAt || req.body.lgpdConsentDate || new Date().toISOString();
        const lgpdVersion = req.body.lgpdVersion || "1.0";
        const forwardedHeader = req.headers && (req.headers["x-forwarded-for"] || req.headers["x-real-ip"]);
        const rawIp = forwardedHeader
            ? (typeof forwardedHeader === "string" ? forwardedHeader.split(",")[0].trim() : forwardedHeader[0])
            : req.ip || (req.socket && req.socket.remoteAddress) || "127.0.0.1";
        const clientIp = rawIp.replace(/^::ffff:/, "");
        const userAgent = (req.headers && req.headers["user-agent"]) || "Desconhecido";
        const cleanCpf = req.body.cpf ? String(req.body.cpf).replace(/\D/g, "") : null;
        const institution = req.body.institution || req.body.instituicao || null;

        const result = await usersCollection.insertOne({
            email,
            password: hashedPassword, // compatibilidade
            senha_hash: hashedPassword, // especificação
            name, // compatibilidade
            nome: name, // especificação
            cargo, // compatibilidade
            role: cargo.toUpperCase(), // especificação (PROFESSOR, ALUNO)
            cpf: cleanCpf,
            institution,
            instituicao: institution,
            isVerified: false,
            validationCode,
            lgpdAccepted: true,
            lgpdAcceptedAt: new Date(lgpdAcceptedAt),
            lgpdVersion,
            termosLgpd: {
                aceito: true,
                versao: lgpdVersion,
                dataAceite: new Date(lgpdAcceptedAt),
                ip: clientIp,
                userAgent,
            },
            createdAt: new Date(),
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
            lgpdAccepted: true,
            termosLgpd: {
                aceito: true,
                versao: lgpdVersion,
                dataAceite: new Date(lgpdAcceptedAt),
            },
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