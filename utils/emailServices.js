import nodemailer from "nodemailer";
import "dotenv/config";

const user = process.env.SMTP_USER || process.env.GMAIL_USER;
const pass = process.env.SMTP_PASSWORD || process.env.GMAIL_PASS;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: (Number(process.env.SMTP_PORT) || 465) === 465,
  auth: {
    user,
    pass,
  },
  tls: {
    rejectUnauthorized: false, // Ignora certificados autoassinados
  },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const mailOptions = {
      from: `"Torneio de Robótica" <${user}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("E-mail enviado:", info.response);
    return info;
  } catch (err) {
    console.error("Erro ao enviar e-mail:", err);
    throw err;
  }
};

export default sendEmail;