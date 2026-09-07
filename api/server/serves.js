import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";
import cookieParser from "cookie-parser";
import http from "http";
import { initSocket } from "../sockets/index.js";
import apiRedirect from "../routes/index.js";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { StatusCodes } from "http-status-codes";
import chalk from "chalk";
import session from "express-session";
import MongoStore from "connect-mongo";
import { getDb } from "../db.js";

const server = express();

server.use(morgan("dev"));
server.use(
    cors({
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        credentials: true,
    })
);
server.use(cookieParser(process.env.COOKIE_SECRET || "insira_um_segredo_para_assinar_os_cookies"));
server.use(express.json());
server.use(express.urlencoded({ extended: true }));

// Configuração de Sessões
getDb().then((db) => {
    server.use(
        session({
            secret: process.env.SESSION_SECRET || "default_secret",
            resave: false,
            saveUninitialized: false,
            store: MongoStore.create({ client: db.client }),
            cookie: { secure: false, sameSite: "lax" },
        })
    );

    // Rotas da API
    server.use("/api/v1", apiRedirect);
    server.use("/pages", express.static(path.resolve("./public/pages")));
    server.use("/assets", express.static(path.resolve("./public/assets")));

    // Swagger Documentation
    const options = {
        definition: {
            openapi: "3.1.0",
            info: {
                title: "Api sumo",
                version: "0.1.0",
                description: "Uma simples documentação da nossa api.",
                contact: {
                    name: "Master Barreto",
                    url: "https://github.com/MasterBarreto",
                },
            },
            servers: [
                {
                    url: "http://localhost:3000",
                },
            ],
        },
        apis: ["./controllers/*/*.js", "./routes/*.js"],
    };

    const specs = swaggerJsdoc(options);
    server.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));

    // 404 Error Handler
    server.use((req, res) => {
        console.log(chalk.yellow("Sistema 💻 : Rota não encontrada"));
        return res.status(StatusCodes.NOT_FOUND).json({
            error: {
                message: "Not Found",
                status: StatusCodes.NOT_FOUND,
            },
        });
    });

    // Inicia o servidor
    const PORT = process.env.PORT || 3000;
    const httpServer = http.createServer(server);
    const io = initSocket(httpServer, process.env.CLIENT_URL || "http://localhost:5173");
    server.set("io", io);

    httpServer.listen(PORT, '0.0.0.0', () => {
        console.log(chalk.green(`Sistema 💻 : Servidor rodando na porta ${PORT}`));
    });
});

// Ping automático para evitar que o Render durma
const PING_URL = process.env.PING_URL || "https://apisubaulas.onrender.com/api/v1/";
setInterval(() => {
    fetch(PING_URL)
        .then(() => console.log("Ping enviado para manter o Render acordado"))
        .catch(() => console.log("Falha ao enviar ping (Render pode estar dormindo)"));
}, 1000 * 60 * 14); // a cada 14 minutos (menos que 15 para garantir)