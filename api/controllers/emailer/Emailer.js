import sendEmail from "../../../utils/emailServices.js";
import fs from "fs";
import path from "path";

export const enviarEmailConfirmacao = async (req, res) => {
  const { email, nome } = req.body;

  try {
    // Caminho para o arquivo HTML
    const templatePath = path.resolve("public/pages/emailTemplate.html");
    let html = fs.readFileSync(templatePath, "utf-8");

    // Substitui o placeholder {{nome}} pelo nome do usuário
    html = html.replace("{{nome}}", nome);

    await sendEmail({
      to: email,
      subject: "Confirmação de Cadastro",
      html,
    });

    res.status(200).json({ mensagem: "E-mail enviado com sucesso" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Erro ao enviar o e-mail" });
  }
};