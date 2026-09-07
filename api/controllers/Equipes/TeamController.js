import { TeamRepository, UserRepository, toObjectId } from "../../repositories/dbRepository.js";
import yup from "yup";

// Validate team creation
const createTeamSchema = yup.object().shape({
  nome: yup.string().required(),
});

export const createTeam = async (req, res) => {
  try {
    const { nome, fullName, instituicao, members, arenas, robotName, category } = req.body;
    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: "Nome da equipe é obrigatório." });
    }
    const criadorId = req.user ? req.user.id : "user-creator";

    const existing = await TeamRepository.findOne({ nome: nome.trim() });
    if (existing) {
      return res.status(400).json({ error: "Nome de equipe já cadastrado." });
    }

    const teamCode = `#RA-2026-${Math.floor(100 + Math.random() * 900)}`;
    const protocolo = `NR-2026-${Math.floor(10000 + Math.random() * 89999)}-X`;
    const prefix = (nome || "TEAM").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase();
    const captainCode = `CAP-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newTeamDoc = {
      nome: nome.trim(),
      fullName: fullName || nome.trim(),
      teamId: teamCode,
      protocolo,
      captainCode,
      instituicao: instituicao || "Senac Hub Academy",
      criadorId,
      status: "PENDENTE",
      robotName: robotName || "Kensei Blade 3.0",
      category: category || "Heavyweight Sumô 3kg (Autônomo)",
      members: Array.isArray(members) ? members : [],
      arenas: Array.isArray(arenas) ? arenas : ["Sumô"],
      submittedAt: new Date().toISOString(),
    };

    const team = await TeamRepository.insertOne(newTeamDoc);
    return res.status(201).json({
      ...newTeamDoc,
      id: team.insertedId || team._id,
      _id: team.insertedId || team._id,
      teamId: teamCode,
      protocolo,
      captainCode,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const joinTeam = async (req, res) => {
  try {
    const { captainCode, role, memberData } = req.body;
    if (!captainCode || !captainCode.trim()) {
      return res.status(400).json({ error: "O Código de Convite do Capitão é obrigatório para ingressar nesta equipe." });
    }

    const cleanCode = captainCode.trim().toUpperCase();
    const team = await TeamRepository.findOne({
      $or: [
        { captainCode: cleanCode },
        { captainCode: new RegExp(`^${cleanCode}$`, "i") }
      ]
    });

    if (!team) {
      return res.status(404).json({ error: "Código do Capitão inválido ou inexistente. Solicite o código de acesso ao líder da equipe." });
    }

    const currentMembers = team.members || [];
    if (currentMembers.length >= 5) {
      return res.status(400).json({ error: "Esta equipe já atingiu o limite máximo de 5 integrantes permitidos pelo regulamento." });
    }

    const memberName = memberData?.name || req.user?.name || "Novo Integrante";
    const memberEmail = memberData?.email || req.user?.email || "";
    const memberCpf = memberData?.cpf || `000.000.${Math.floor(100 + Math.random() * 899)}-00`;
    const initials = memberName.split(" ").filter(Boolean).map(n => n[0]).join("").toUpperCase().slice(0, 2) || "AL";

    // Verificar se já é membro da equipe para evitar duplicidade
    const alreadyMember = currentMembers.find(
      (m) => (memberEmail && m.email && m.email.toLowerCase() === memberEmail.toLowerCase()) ||
             (m.name && m.name.toLowerCase() === memberName.toLowerCase())
    );

    if (alreadyMember) {
      return res.status(200).json({
        message: "Você já faz parte desta equipe!",
        team: {
          id: team._id.toString(),
          _id: team._id.toString(),
          name: team.nome || team.name,
          nome: team.nome || team.name,
          code: team.teamId,
          captainCode: team.captainCode,
          robotName: team.robotName || team.robot || "Kensei Blade 3.0",
          members: currentMembers,
        },
        member: alreadyMember,
      });
    }

    const newMember = {
      id: Math.random().toString(36).substring(2, 9),
      initials,
      color: "#00356a",
      name: memberName,
      email: memberEmail,
      memberId: `UID: NR-2026-${Math.floor(100 + Math.random() * 899)}`,
      role: role || memberData?.role || "Competidor Técnico",
      cpf: memberCpf,
      rg: memberData?.rg || "",
      docStatus: "approved",
      history: [{ date: new Date().toLocaleString("pt-BR"), label: "Entrada na Equipe", type: "neutral" }],
    };

    await TeamRepository.updateOne(
      { _id: team._id },
      { $push: { members: newMember } }
    );

    return res.status(200).json({
      message: "Você ingressou na equipe com sucesso!",
      team: {
        id: team._id.toString(),
        _id: team._id.toString(),
        name: team.nome || team.name,
        nome: team.nome || team.name,
        code: team.teamId,
        captainCode: team.captainCode,
        robotName: team.robotName || team.robot || "Kensei Blade 3.0",
        members: [...currentMembers, newMember]
      },
      member: newMember
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const DEFAULT_TEAM_MEMBERS = {
  CyberBots: [
    {
      id: "rm", initials: "RM", color: "#3b82f6",
      name: "Ricardo Mendes", memberId: "ID: 489.223.11-09",
      role: "Líder Técnico", team: "ALPHABOT",
      cpf: "123.456.789-00", rg: "12.345.678-9", birthDate: "15/05/2004",
      docStatus: "pending",
      history: [{ date: "12/03/2024, 11:00", label: "Inscrição Original", type: "neutral" }],
    },
    {
      id: "js", initials: "JS", color: "#10b981",
      name: "Juliana Silva", memberId: "ID: 489.223.11-09",
      role: "Programadora", team: "ALPHABOT",
      cpf: "987.654.321-00", rg: "98.765.432-1", birthDate: "20/03/2005",
      docStatus: "docs_ok",
      history: [{ date: "12/03/2024, 11:00", label: "Inscrição Original", type: "neutral" }],
    },
    {
      id: "lt", initials: "LT", color: "#94a3b8",
      name: "Lucas Torres", memberId: "ID: 112.334.44-87",
      role: "Mecânico", team: "ALPHABOT",
      cpf: "456.789.123-00", rg: "45.678.912-3", birthDate: "08/11/2005",
      docStatus: "awaiting",
      history: [{ date: "12/03/2024, 11:00", label: "Inscrição Original", type: "neutral" }],
    },
  ],
  TechKnights: [
    {
      id: "ab", initials: "AB", color: "#f59e0b",
      name: "Ana Beatriz", memberId: "ID: 221.445.88-01",
      role: "Líder Técnica", team: "TECHKNIGHTS",
      cpf: "321.654.987-00", rg: "32.165.498-7", birthDate: "14/07/2004",
      docStatus: "awaiting_review",
      judgeNote: "Por favor, corrija: o documento de direito de imagem está faltando a assinatura do responsável.",
      history: [
        { date: "14/03/2024, 09:45", label: "Reprovação Anterior", type: "rejected", by: "Admin: Carla S.", note: "Por favor, corrija: o documento de direito de imagem está faltando a assinatura do responsável." },
        { date: "12/03/2024, 11:00", label: "Inscrição Original", type: "neutral" },
      ],
    },
    {
      id: "mv", initials: "MV", color: "#8b5cf6",
      name: "Marcos Vinícius", memberId: "ID: 334.221.77-02",
      role: "Programador", team: "TECHKNIGHTS",
      cpf: "789.123.456-00", rg: "78.912.345-6", birthDate: "30/09/2005",
      docStatus: "approved",
      approvalDate: "Oct 20, 2023",
      approvedBy: "Professor Barberato",
      history: [
        { date: "14/03/2024, 09:45", label: "Aprovação", type: "approved", by: "Admin: Carla S." },
        { date: "14/03/2024, 09:45", label: "Reprovação Anterior", type: "rejected", by: "Admin: Carla S.", note: "Documento ilegível." },
        { date: "12/03/2024, 11:00", label: "Inscrição Original", type: "neutral" },
      ],
    },
  ],
  MechEng: [
    {
      id: "pt", initials: "PT", color: "#06b6d4",
      name: "Pedro Takeda", memberId: "ID: 554.332.99-11",
      role: "Líder Técnico", team: "MECHENG",
      cpf: "654.321.987-00", rg: "65.432.198-7", birthDate: "22/01/2004",
      docStatus: "approved",
      approvalDate: "Oct 20, 2023",
      approvedBy: "Professor Barberato",
      history: [
        { date: "14/03/2024, 09:45", label: "Aprovação", type: "approved", by: "Admin: Carla S." },
        { date: "12/03/2024, 11:00", label: "Inscrição Original", type: "neutral" },
      ],
    },
    {
      id: "lr", initials: "LR", color: "#ec4899",
      name: "Larissa Ramos", memberId: "ID: 443.112.66-22",
      role: "Programadora", team: "MECHENG",
      cpf: "111.222.333-00", rg: "11.122.233-3", birthDate: "05/06/2005",
      docStatus: "approved",
      approvalDate: "Oct 20, 2023",
      approvedBy: "Professor Barberato",
      history: [
        { date: "14/03/2024, 09:45", label: "Aprovação", type: "approved", by: "Admin: Carla S." },
        { date: "12/03/2024, 11:00", label: "Inscrição Original", type: "neutral" },
      ],
    },
  ],
};

const FIRST_NAMES = ["Lucas", "Mariana", "Gabriel", "Beatriz", "Matheus", "Larissa", "Rafael", "Camila", "Felipe", "Amanda", "Rodrigo", "Carolina", "Thiago", "Juliana", "Vinícius", "Fernanda", "Leonardo", "Letícia"];
const LAST_NAMES = ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Lima", "Ferreira", "Costa", "Rodrigues", "Almeida", "Nascimento", "Alves", "Carvalho", "Mendes"];
const SAMPLE_ROLES = ["Líder Técnico", "Programador(a)", "Mecânico(a)"];
const SAMPLE_PHOTOS = [
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=faces&cs=tinysrgb&fit=crop&h=160&w=160",
  "https://images.unsplash.com/photo-1494790108755-2616b612b786?crop=faces&cs=tinysrgb&fit=crop&h=160&w=160",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=faces&cs=tinysrgb&fit=crop&h=160&w=160",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?crop=faces&cs=tinysrgb&fit=crop&h=160&w=160",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=faces&cs=tinysrgb&fit=crop&h=160&w=160",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?crop=faces&cs=tinysrgb&fit=crop&h=160&w=160"
];

export const getTeams = async (req, res) => {
  try {
    let teams = await TeamRepository.find({});
    
    // Seed members for any team without members
    for (let i = 0; i < teams.length; i++) {
      const t = teams[i];
      if (!t.members || t.members.length === 0) {
        if (DEFAULT_TEAM_MEMBERS[t.nome]) {
          await TeamRepository.updateOne(
            { _id: t._id },
            { $set: { members: DEFAULT_TEAM_MEMBERS[t.nome], status: t.nome === "MechEng" ? "APROVADO" : t.nome === "TechKnights" ? "AJUSTE NECESSÁRIO" : "PENDENTE" } }
          );
        } else {
          const genMembers = SAMPLE_ROLES.map((role, idx) => {
            const fn = FIRST_NAMES[(i * 3 + idx) % FIRST_NAMES.length];
            const ln = LAST_NAMES[(i * 2 + idx) % LAST_NAMES.length];
            const name = `${fn} ${ln}`;
            const initials = `${fn[0]}${ln[0]}`;
            const cpfNum = String(10000000000 + i * 1000 + idx).slice(1);
            const cpf = `${cpfNum.slice(0, 3)}.${cpfNum.slice(3, 6)}.${cpfNum.slice(6, 9)}-${cpfNum.slice(9, 11)}`;
            return {
              id: `m_${t._id}_${idx}`,
              initials,
              color: ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"][(i + idx) % 6],
              name,
              memberId: `ID: ${cpf.slice(0, 7)}-${idx + 1}`,
              role,
              team: t.nome,
              cpf,
              rg: `${Math.floor(10 + Math.random() * 89)}.${Math.floor(100 + Math.random() * 899)}.${Math.floor(100 + Math.random() * 899)}-X`,
              birthDate: "15/08/2004",
              docStatus: "approved",
              photo: SAMPLE_PHOTOS[(i + idx) % SAMPLE_PHOTOS.length],
              history: [{ date: new Date().toLocaleString("pt-BR"), label: "Inscrição Original", type: "neutral" }],
            };
          });
          await TeamRepository.updateOne(
            { _id: t._id },
            { $set: { members: genMembers } }
          );
        }
      }
    }

    teams = await TeamRepository.find({});


    const formattedTeams = teams.map((t) => ({
      ...t,
      id: t._id.toString(),
      name: t.nome || t.name,
      fullName: t.fullName || t.nome || t.name,
      teamId: t.teamId || `#RA-2026-${t._id.toString().slice(-3)}`,
      status: t.status || "PENDENTE",
      members: Array.isArray(t.members) ? t.members : [],
      arenas: Array.isArray(t.arenas) ? t.arenas : [],
    }));

    return res.status(200).json(formattedTeams);
  } catch (error) {
    console.error("Erro ao buscar equipes:", error);
    return res.status(500).json({ error: error.message });
  }
};


export const getTeamById = async (req, res) => {
  const { id } = req.params;
  try {
    const team = await TeamRepository.findOne({ _id: id });
    if (!team) {
      return res.status(404).json({ error: "Equipe não encontrada." });
    }
    return res.status(200).json(team);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateTeamStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "APROVADO", "AJUSTE NECESSÁRIO", "PENDENTE"
  try {
    if (!["APROVADO", "AJUSTE NECESSÁRIO", "PENDENTE"].includes(status)) {
      return res.status(400).json({ error: "Status inválido." });
    }

    const result = await TeamRepository.updateOne(
      { _id: id },
      { $set: { status } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Equipe não encontrada." });
    }

    return res.status(200).json({ message: "Status da equipe atualizado com sucesso." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Members CRUD inside team
export const addMember = async (req, res) => {
  const { id } = req.params;
  const { nome, email, cpf, rg, birthDate, role } = req.body;

  try {
    const team = await TeamRepository.findOne({ _id: id });
    if (!team) {
      return res.status(404).json({ error: "Equipe não encontrada." });
    }

    if (team.members.length >= 5) {
      return res.status(400).json({ error: "Limite máximo de 5 membros atingido." });
    }

    if (team.members.some(m => m.cpf === cpf)) {
      return res.status(400).json({ error: "Membro com este CPF já cadastrado na equipe." });
    }

    const member = {
      id: Math.random().toString(36).substring(2, 9),
      initials: nome.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2),
      color: "#" + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
      name: nome,
      memberId: `ID: ${cpf.slice(0, 3)}.${cpf.slice(3, 6)}`,
      role: role || "Competidor",
      cpf,
      rg: rg || "",
      birthDate: birthDate || "",
      team: team.nome.toUpperCase(),
      docStatus: "pending",
      history: [{ date: new Date().toLocaleString("pt-BR"), label: "Inscrição Original", type: "neutral" }],
    };

    await TeamRepository.updateOne(
      { _id: id },
      { $push: { members: member } }
    );

    return res.status(201).json(member);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const removeMember = async (req, res) => {
  const { id, cpf } = req.params;
  try {
    const result = await TeamRepository.updateOne(
      { _id: id },
      { $pull: { members: { cpf } } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Equipe não encontrada." });
    }

    return res.status(200).json({ message: "Membro removido com sucesso." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateMemberDocStatus = async (req, res) => {
  const { id, cpf } = req.params;
  const { docStatus, judgeNote } = req.body;

  try {
    const team = await TeamRepository.findOne({ _id: id });
    if (!team) {
      return res.status(404).json({ error: "Equipe não encontrada." });
    }

    const memberIdx = team.members.findIndex(m => m.cpf === cpf);
    if (memberIdx === -1) {
      return res.status(404).json({ error: "Membro não encontrado." });
    }

    const updatedMembers = [...team.members];
    const member = updatedMembers[memberIdx];

    member.docStatus = docStatus;
    if (judgeNote) {
      member.judgeNote = judgeNote;
    }

    const nowStr = new Date().toLocaleString("pt-BR");
    const historyItem = {
      date: nowStr,
      label: docStatus === "approved" ? "Aprovação" : "Atualização de Documento",
      type: docStatus === "approved" ? "approved" : "neutral",
      by: req.user?.role || "Admin",
      note: judgeNote,
    };

    member.history = [historyItem, ...member.history];

    await TeamRepository.updateOne(
      { _id: id },
      { $set: { members: updatedMembers } }
    );

    return res.status(200).json({ message: "Status do documento do membro atualizado.", member });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const deleteTeam = async (req, res) => {
  const { id } = req.params;
  try {
    const objId = toObjectId(id);
    const team = await TeamRepository.findOne({
      $or: [
        ...(objId ? [{ _id: objId }] : []),
        { _id: id },
        { teamId: id }
      ]
    });

    if (!team) {
      return res.status(404).json({ error: "Equipe não encontrada." });
    }

    await TeamRepository.deleteOne({ _id: team._id });

    // Desvincula equipe dos usuários associados
    await UserRepository.updateMany(
      {
        $or: [
          { teamId: team._id.toString() },
          { teamId: team.teamId },
          { teamName: team.nome || team.name }
        ]
      },
      {
        $unset: { teamId: "", teamName: "" }
      }
    );

    return res.status(200).json({
      message: `Equipe "${team.nome || team.name}" excluída com sucesso.`
    });
  } catch (error) {
    console.error("Erro ao excluir equipe:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const transferMember = async (req, res) => {
  const { fromTeamId, toTeamId, memberIdentifier } = req.body;

  try {
    if (!fromTeamId || !toTeamId || !memberIdentifier) {
      return res.status(400).json({
        error: "Dados insuficientes para transferência (fromTeamId, toTeamId e memberIdentifier são obrigatórios)."
      });
    }

    if (fromTeamId === toTeamId) {
      return res.status(400).json({
        error: "A equipe de destino deve ser diferente da equipe de origem."
      });
    }

    const fromTeam = await TeamRepository.findOne({
      $or: [{ _id: fromTeamId }, { teamId: fromTeamId }, { nome: fromTeamId }]
    });
    if (!fromTeam) {
      return res.status(404).json({ error: "Equipe de origem não encontrada." });
    }

    const toTeam = await TeamRepository.findOne({
      $or: [{ _id: toTeamId }, { teamId: toTeamId }, { nome: toTeamId }]
    });
    if (!toTeam) {
      return res.status(404).json({ error: "Equipe de destino não encontrada." });
    }

    if (fromTeam._id.toString() === toTeam._id.toString()) {
      return res.status(400).json({
        error: "A equipe de destino deve ser diferente da equipe de origem."
      });
    }

    const targetMembers = toTeam.members || [];
    if (targetMembers.length >= 5) {
      return res.status(400).json({
        error: "A equipe de destino já atingiu o limite máximo de 5 integrantes permitidos."
      });
    }

    const sourceMembers = fromTeam.members || [];
    const memberIndex = sourceMembers.findIndex(m =>
      m.id === memberIdentifier ||
      m.cpf === memberIdentifier ||
      (m.email && m.email.toLowerCase() === String(memberIdentifier).toLowerCase()) ||
      (m.name && m.name.toLowerCase() === String(memberIdentifier).toLowerCase())
    );

    if (memberIndex === -1) {
      return res.status(404).json({ error: "Integrante não encontrado na equipe de origem." });
    }

    const member = sourceMembers[memberIndex];

    // Verificar se integrante já existe na equipe de destino
    const alreadyInTarget = targetMembers.some(m =>
      (m.cpf && member.cpf && m.cpf === member.cpf) ||
      (m.email && member.email && m.email.toLowerCase() === member.email.toLowerCase())
    );
    if (alreadyInTarget) {
      return res.status(400).json({ error: "Este participante já faz parte da equipe de destino." });
    }

    // Remover da equipe de origem
    const updatedSourceMembers = sourceMembers.filter((_, idx) => idx !== memberIndex);
    await TeamRepository.updateOne(
      { _id: fromTeam._id },
      { $set: { members: updatedSourceMembers } }
    );

    // Preparar integrante com nova equipe e histórico de auditoria
    const nowStr = new Date().toLocaleString("pt-BR");
    const historyItem = {
      date: nowStr,
      label: `Transferido para ${(toTeam.nome || toTeam.name)}`,
      type: "neutral",
      by: req.user?.role || "Admin",
      note: `Transferido da equipe "${fromTeam.nome || fromTeam.name}" pelo Administrador`
    };

    const updatedMember = {
      ...member,
      team: (toTeam.nome || toTeam.name).toUpperCase(),
      history: [historyItem, ...(member.history || [])]
    };

    const updatedTargetMembers = [...targetMembers, updatedMember];
    await TeamRepository.updateOne(
      { _id: toTeam._id },
      { $set: { members: updatedTargetMembers } }
    );

    // Atualizar vínculo se usuário existir na coleção users
    if (member.email || member.cpf) {
      await UserRepository.updateMany(
        {
          $or: [
            ...(member.email ? [{ email: member.email.toLowerCase() }] : []),
            ...(member.cpf ? [{ cpf: member.cpf }] : [])
          ]
        },
        {
          $set: {
            teamId: toTeam._id.toString(),
            teamName: toTeam.nome || toTeam.name
          }
        }
      );
    }

    return res.status(200).json({
      message: `Participante "${member.name}" transferido para a equipe "${toTeam.nome || toTeam.name}" com sucesso!`,
      member: updatedMember,
      fromTeamId: fromTeam._id.toString(),
      toTeamId: toTeam._id.toString()
    });
  } catch (error) {
    console.error("Erro ao transferir integrante:", error);
    return res.status(500).json({ error: error.message });
  }
};

