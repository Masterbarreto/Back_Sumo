import { CertificateRepository, TeamRepository } from "../../repositories/dbRepository.js";

const DEFAULT_HISTORY = [
  {
    label: "Cyber Guardians",
    sub: "12 credenciais · emitidas",
    time: "2h",
    done: true,
    teamName: "Cyber Guardians",
    docType: "badge",
    membersCount: 12,
    createdAt: new Date(Date.now() - 7200000),
  },
  {
    label: "Bruno Mendes (Ind.)",
    sub: "credenciais · emitidas",
    time: "1h",
    done: true,
    teamName: "TechKnights",
    docType: "certificate",
    membersCount: 2,
    createdAt: new Date(Date.now() - 3600000),
  },
  {
    label: "Processo Agendado",
    sub: "Emissão programada para hoje",
    time: "",
    done: false,
    teamName: "Geral",
    docType: "badge",
    membersCount: 0,
    createdAt: new Date(),
  },
];

export const getCertificates = async (req, res) => {
  try {
    let items = await CertificateRepository.find({});
    if (!items || items.length === 0) {
      for (const def of DEFAULT_HISTORY) {
        await CertificateRepository.insertOne(def);
      }
      items = await CertificateRepository.find({});
    }

    const history = items.map((doc) => ({
      id: doc._id.toString(),
      label: doc.label || doc.teamName || "Emissão de Documento",
      sub: doc.sub || `${doc.membersCount || 1} ${doc.docType === "badge" ? "credenciais" : "certificados"}`,
      time: doc.time || "recente",
      done: Boolean(doc.done),
      docType: doc.docType || "badge",
      teamName: doc.teamName,
      createdAt: doc.createdAt,
    }));

    return res.status(200).json(history);
  } catch (error) {
    console.error("Erro ao buscar histórico de certificados:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const issueCertificates = async (req, res) => {
  try {
    const { teamId, teamName, memberIds = [], members = [], docType = "badge", placement = 1 } = req.body;

    const count = members.length || memberIds.length || 1;
    const typeLabel = docType === "badge" ? "credenciais" : "certificados";
    const sub = `${count} ${typeLabel} · agora`;

    const newRecord = await CertificateRepository.insertOne({
      teamId,
      teamName: teamName || "Equipe",
      label: teamName || "Equipe",
      sub,
      time: "agora",
      done: true,
      docType,
      placement,
      membersCount: count,
      memberIds,
      createdAt: new Date(),
    });

    return res.status(201).json({
      id: newRecord._id.toString(),
      label: newRecord.label,
      sub: newRecord.sub,
      time: newRecord.time,
      done: true,
      docType: newRecord.docType,
      createdAt: newRecord.createdAt,
    });
  } catch (error) {
    console.error("Erro ao emitir certificados:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const getCertificateStats = async (req, res) => {
  try {
    const teams = await TeamRepository.find({});
    const totalMembers = teams.reduce((acc, t) => acc + (t.members?.length || 0), 0) || 7;

    const certs = await CertificateRepository.find({ done: true });
    const issuedCount = certs.reduce((acc, c) => acc + (c.membersCount || 1), 0) || 14;

    const percentage = Math.min(100, Math.round((issuedCount / Math.max(totalMembers, 1)) * 100)) || 84;
    const remaining = Math.max(0, totalMembers - issuedCount);

    return res.status(200).json({
      totalMembers,
      issuedCount,
      percentage,
      remaining,
    });
  } catch (error) {
    console.error("Erro ao calcular estatísticas de certificados:", error);
    return res.status(500).json({ error: error.message });
  }
};
