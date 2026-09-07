import {
  TournamentRepository,
  EnrollmentRepository,
  TeamRepository,
  MatchRepository,
  RoundRepository,
  ArenaRepository,
  toObjectId
} from "../../repositories/dbRepository.js";
import { ObjectId } from "mongodb";
import yup from "yup";

// --- TOURNAMENTS ---

export const createTournament = async (req, res) => {
  const schema = yup.object().shape({
    nome: yup.string().required(),
  });

  try {
    await schema.validate(req.body);
    const { nome } = req.body;

    const tournament = await TournamentRepository.insertOne({
      nome,
      status: "RASCUNHO",
      createdAt: new Date(),
    });

    return res.status(201).json(tournament);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

export const getTournaments = async (req, res) => {
  try {
    const tournaments = await TournamentRepository.find({});
    return res.status(200).json(tournaments);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getTournamentById = async (req, res) => {
  const { id } = req.params;
  try {
    const tournament = await TournamentRepository.findOne({ _id: id });
    if (!tournament) {
      return res.status(404).json({ error: "Torneio não encontrado." });
    }
    return res.status(200).json(tournament);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const updateTournamentStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "RASCUNHO", "INSCRICOES_ABERTAS", "CHAVEAMENTO_PRONTO", "EM_ANDAMENTO", "FINALIZADO"
  try {
    const result = await TournamentRepository.updateOne(
      { _id: id },
      { $set: { status } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Torneio não encontrado." });
    }
    return res.status(200).json({ message: "Status do torneio atualizado com sucesso." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// --- ENROLLMENTS ---

export const enrollTeam = async (req, res) => {
  const { tournamentId, teamId } = req.body;
  try {
    const tournament = await TournamentRepository.findOne({ _id: tournamentId });
    if (!tournament) {
      return res.status(404).json({ error: "Torneio não encontrado." });
    }

    const team = await TeamRepository.findOne({ _id: teamId });
    if (!team) {
      return res.status(404).json({ error: "Equipe não encontrada." });
    }

    const existing = await EnrollmentRepository.findOne({ tournamentId, teamId });
    if (existing) {
      return res.status(400).json({ error: "Equipe já inscrita neste torneio." });
    }

    const enrollment = await EnrollmentRepository.insertOne({
      tournamentId,
      teamId,
      status: "PENDENTE",
      createdAt: new Date(),
    });

    return res.status(201).json(enrollment);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getEnrollments = async (req, res) => {
  const { tournamentId } = req.params;
  try {
    const enrollments = await EnrollmentRepository.find({ tournamentId });
    // Join with team details
    const populated = await Promise.all(
      enrollments.map(async (e) => {
        const team = await TeamRepository.findOne({ _id: e.teamId });
        return { ...e, team };
      })
    );
    return res.status(200).json(populated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const approveEnrollment = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "APROVADA", "PENDENTE"
  try {
    const result = await EnrollmentRepository.updateOne(
      { _id: id },
      { $set: { status } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Inscrição não encontrada." });
    }
    return res.status(200).json({ message: "Status da inscrição atualizado com sucesso." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// --- BRACKET GENERATION (CHAVEAMENTO) ---

export const generateChaves = async (req, res) => {
  const { tournamentId } = req.body;

  try {
    const tournament = await TournamentRepository.findOne({ _id: tournamentId });
    if (!tournament) {
      return res.status(404).json({ error: "Torneio não encontrado." });
    }

    // Get approved enrollments
    const enrollments = await EnrollmentRepository.find({ tournamentId, status: "APROVADA" });
    if (enrollments.length < 2) {
      return res.status(400).json({ error: "São necessárias pelo menos 2 equipes aprovadas para gerar o chaveamento." });
    }

    // Get team details
    const teams = await Promise.all(
      enrollments.map(async (e) => await TeamRepository.findOne({ _id: e.teamId }))
    );

    // Shuffle teams (randomization)
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);

    const N = shuffledTeams.length;
    const K = Math.ceil(Math.log2(N)); // rounds count
    const M = Math.pow(2, K); // next power of 2

    // Create matches in memory first
    const totalMatches = M - 1;
    const matches = Array.from({ length: totalMatches }, (_, i) => ({
      _id: new ObjectId(),
      tournamentId,
      phase: i === 0 ? "FINAL" : i < 3 ? "SEMIFINAL" : i < 7 ? "QUARTAS" : `ROUND_OF_${Math.pow(2, K - Math.floor(Math.log2(i + 1)))}`,
      position: i, // used for identifying left/right child
      team1Id: null,
      team2Id: null,
      winnerId: null,
      status: "PENDENTE",
      nextMatchId: null,
    }));

    // Link nextMatchId references (parent is floor((i-1)/2))
    for (let i = 1; i < totalMatches; i++) {
      const parentIdx = Math.floor((i - 1) / 2);
      matches[i].nextMatchId = matches[parentIdx]._id.toString();
    }

    // Assign teams to the bottom level matches (indices from M/2 - 1 to M - 2)
    const leafStart = M / 2 - 1;
    for (let j = 0; j < N; j++) {
      const matchIdx = leafStart + Math.floor(j / 2);
      if (j % 2 === 0) {
        matches[matchIdx].team1Id = shuffledTeams[j]._id.toString();
      } else {
        matches[matchIdx].team2Id = shuffledTeams[j]._id.toString();
      }
    }

    // Resolve BYEs recursively or in reverse order to ensure promotions propagate up
    for (let i = totalMatches - 1; i >= 0; i--) {
      const match = matches[i];
      // A BYE happens if team1Id is set but team2Id is null AND it is a leaf level slot
      // Or if it gets promoted and has only one child
      const isLeaf = i >= leafStart;
      
      if (isLeaf && match.team1Id && !match.team2Id) {
        match.winnerId = match.team1Id;
        match.status = "FINALIZADO";

        // Promote to parent
        if (match.nextMatchId) {
          const parent = matches.find(m => m._id.toString() === match.nextMatchId);
          if (parent) {
            if (match.position % 2 === 1) {
              parent.team1Id = match.team1Id;
            } else {
              parent.team2Id = match.team1Id;
            }
          }
        }
      }
    }

    // Clean up all old matches for this tournament
    const matchesCol = await MatchRepository.getCollection();
    await matchesCol.deleteMany({ tournamentId });

    // Save matches to DB
    await matchesCol.insertMany(matches);

    // Update tournament status
    await TournamentRepository.updateOne(
      { _id: tournamentId },
      { $set: { status: "CHAVEAMENTO_PRONTO" } }
    );

    return res.status(200).json({ message: "Chaveamento gerado com sucesso!", matches });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMatches = async (req, res) => {
  const { tournamentId } = req.params;
  try {
    const matches = await MatchRepository.find({ tournamentId });
    // Join with team names for readability
    const populated = await Promise.all(
      matches.map(async (m) => {
        const team1 = m.team1Id ? await TeamRepository.findOne({ _id: m.team1Id }) : null;
        const team2 = m.team2Id ? await TeamRepository.findOne({ _id: m.team2Id }) : null;
        const winner = m.winnerId ? await TeamRepository.findOne({ _id: m.winnerId }) : null;
        return { ...m, team1, team2, winner };
      })
    );
    return res.status(200).json(populated);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// --- ROUNDS & MATCH DECISION ---

export const getMatchById = async (req, res) => {
  const { id } = req.params;
  try {
    const match = await MatchRepository.findOne({ _id: id });
    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }
    const rounds = await RoundRepository.find({ matchId: id });
    const team1 = match.team1Id ? await TeamRepository.findOne({ _id: match.team1Id }) : null;
    const team2 = match.team2Id ? await TeamRepository.findOne({ _id: match.team2Id }) : null;
    return res.status(200).json({ match, rounds, team1, team2 });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const addRound = async (req, res) => {
  const { matchId } = req.params;
  const { winnerId, duration, team1ActiveDuration, team2ActiveDuration, isExtraRound } = req.body;

  try {
    const match = await MatchRepository.findOne({ _id: matchId });
    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    if (match.status === "FINALIZADO") {
      return res.status(400).json({ error: "Partida já finalizada." });
    }

    const existingRounds = await RoundRepository.find({ matchId });
    const roundNumber = existingRounds.length + 1;

    // Determine round winner considering ties and automatic desempate
    let resolvedWinnerId = winnerId;

    if (!winnerId) {
      // It is a tie, apply automatic desempate rules:
      // 1. Direct victories in previous rounds
      const team1Wins = existingRounds.filter(r => r.winnerId === match.team1Id).length;
      const team2Wins = existingRounds.filter(r => r.winnerId === match.team2Id).length;

      if (team1Wins > team2Wins) {
        resolvedWinnerId = match.team1Id;
      } else if (team2Wins > team1Wins) {
        resolvedWinnerId = match.team2Id;
      } else {
        // 2. Average victory time in previous rounds (lower is better)
        const team1AvgTime = existingRounds.filter(r => r.winnerId === match.team1Id && r.duration).reduce((acc, r) => acc + r.duration, 0) / (team1Wins || 1);
        const team2AvgTime = existingRounds.filter(r => r.winnerId === match.team2Id && r.duration).reduce((acc, r) => acc + r.duration, 0) / (team2Wins || 1);

        if (team1Wins > 0 && team2Wins > 0) {
          if (team1AvgTime < team2AvgTime) {
            resolvedWinnerId = match.team1Id;
          } else if (team2AvgTime < team1AvgTime) {
            resolvedWinnerId = match.team2Id;
          }
        }
      }

      // 3. Time active in this round (longer is better)
      if (!resolvedWinnerId && team1ActiveDuration && team2ActiveDuration) {
        if (team1ActiveDuration > team2ActiveDuration) {
          resolvedWinnerId = match.team1Id;
        } else if (team2ActiveDuration > team1ActiveDuration) {
          resolvedWinnerId = match.team2Id;
        }
      }
    }

    // Create the round document
    const round = await RoundRepository.insertOne({
      matchId,
      numero: roundNumber,
      winnerId: resolvedWinnerId || null,
      duration: duration || null,
      team1ActiveDuration: team1ActiveDuration || null,
      team2ActiveDuration: team2ActiveDuration || null,
      isExtraRound: !!isExtraRound,
      createdAt: new Date(),
    });

    // Recalculate match state
    const allRounds = [...existingRounds, round];
    const team1Wins = allRounds.filter(r => r.winnerId === match.team1Id).length;
    const team2Wins = allRounds.filter(r => r.winnerId === match.team2Id).length;

    let matchWinnerId = null;
    let matchFinished = false;

    // Best of 3 rules: first to reach 2 wins
    if (team1Wins >= 2) {
      matchWinnerId = match.team1Id;
      matchFinished = true;
    } else if (team2Wins >= 2) {
      matchWinnerId = match.team2Id;
      matchFinished = true;
    }

    // Check if extra round is enabled due to absolute draw (e.g. after round 3 both are tied and resolvedWinnerId was null)
    const enableExtraRound = !matchFinished && allRounds.length >= 3 && team1Wins === team2Wins;

    if (matchFinished) {
      // Finalize match
      await MatchRepository.updateOne(
        { _id: matchId },
        { $set: { status: "FINALIZADO", winnerId: matchWinnerId } }
      );

      // Promote winner to parent match
      if (match.nextMatchId) {
        const parentMatch = await MatchRepository.findOne({ _id: match.nextMatchId });
        if (parentMatch) {
          const updateField = match.position % 2 === 1 ? "team1Id" : "team2Id";
          await MatchRepository.updateOne(
            { _id: match.nextMatchId },
            { $set: { [updateField]: matchWinnerId } }
          );
        }
      }
    } else {
      // Update match status to EM_ANDAMENTO if it wasn't already
      await MatchRepository.updateOne(
        { _id: matchId },
        { $set: { status: "EM_ANDAMENTO" } }
      );
    }

    // Emit socket events if Socket.IO is connected (Phase 4 integration)
    if (req.app.get("io")) {
      const io = req.app.get("io");
      io.to(match.tournamentId).emit("match:updated", { matchId, winnerId: matchWinnerId, status: matchFinished ? "FINALIZADO" : "EM_ANDAMENTO" });
      io.to(match.tournamentId).emit("round:created", { round });
    }

    return res.status(201).json({
      message: "Round registrado com sucesso.",
      round,
      matchFinished,
      winnerId: matchWinnerId,
      enableExtraRound,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const teams = await TeamRepository.find({});
    const tournaments = await TournamentRepository.find({});
    const matches = await MatchRepository.find({});

    const totalEquipes = teams.length;

    let validacoesPendentes = 0;
    teams.forEach((team) => {
      if (team.status === "PENDENTE" || team.status === "AJUSTE NECESSÁRIO") {
        validacoesPendentes++;
      } else if (team.members && Array.isArray(team.members)) {
        const hasPendingMember = team.members.some(
          (m) => m.docStatus === "pending" || m.docStatus === "awaiting_review"
        );
        if (hasPendingMember) validacoesPendentes++;
      }
    });

    const activeTournament = tournaments.find((t) => t.status !== "FINALIZADO") || tournaments[0] || null;
    const allArenas = await ArenaRepository.find({});
    const arenasAtivas = allArenas.filter((a) => a.status === "Ativa" || a.status === "ATIVA").length || (allArenas.length > 0 ? allArenas.length : 3);

    const atividades = [];

    if (activeTournament) {
      atividades.push({
        id: "tourn-" + activeTournament._id,
        tipo: "tournament",
        titulo: `Torneio: ${activeTournament.nome}`,
        subtitulo: `Status atual: ${activeTournament.status}`,
        tempo: "ATUAL",
        data: activeTournament.createdAt || new Date(),
      });
    }

    matches.slice(-2).reverse().forEach((m) => {
      atividades.push({
        id: "match-" + m._id,
        tipo: "match",
        titulo: `Partida ${m.phase || "Fase"}: ${m.status}`,
        subtitulo: m.winnerId ? "Vencedor promovido para a próxima fase" : "Confronto em definição",
        tempo: "RECENTE",
        data: new Date(),
      });
    });

    teams.slice(-5).reverse().forEach((t) => {
      atividades.push({
        id: "team-" + t._id,
        tipo: "team",
        titulo: `Equipe '${t.nome}' Registrada`,
        subtitulo: `Status: ${t.status || "PENDENTE"} • ${t.members?.length || 0} integrantes`,
        tempo: "RECENTE",
        data: t.createdAt || new Date(),
      });
    });

    return res.status(200).json({
      totalEquipes,
      arenasAtivas,
      validacoesPendentes,
      totalTorneios: tournaments.length,
      totalPartidas: matches.length,
      torneioAtivo: activeTournament,
      atividadesRecentes: atividades.slice(0, 6),
      teams: teams.map((t) => ({
        id: t._id,
        nome: t.nome,
        status: t.status,
        membrosQtd: t.members?.length || 0,
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

