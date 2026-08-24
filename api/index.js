import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import apiRedirect from "./routes/index.js";

const app = express();

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Define the routes
app.use("/api/v1", apiRedirect);

// 404 Error Handler
app.use((req, res) => {
    return res.status(404).json({
        error: {
            message: "Not Found",
        },
    });
});

// Export the app for Vercel
export default app;