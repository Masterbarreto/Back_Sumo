import {
  MatchRepository,
  RoundRepository,
  TeamRepository,
  TournamentRepository,
  toObjectId
} from "../../repositories/dbRepository.js";
import { seedTournament } from "../../../scripts/seed_tournament.js";

// Helper to find match by MongoDB _id OR code (e.g. MCH-001)
export async function findMatchByIdOrCode(identifier) {
  if (!identifier) return null;
  const col = await MatchRepository.getCollection();
  
  // Try finding by code
  let match = await col.findOne({ code: identifier });
  if (match) return match;

  // Try finding by customId
  match = await col.findOne({ customId: identifier });
  if (match) return match;

  // Try finding by _id
  try {
    const oid = toObjectId(identifier);
    if (oid) {
      match = await col.findOne({ _id: oid });
      if (match) return match;
    }
  } catch (e) {}

  return null;
}

// GET /api/v1/partidas
export const getAllPartidas = async (req, res) => {
  try {
    const col = await MatchRepository.getCollection();
    let matches = await col.find({}).sort({ position: 1 }).toArray();

    // Auto-seed if empty
    if (!matches || matches.length === 0) {
      await seedTournament();
      matches = await col.find({}).sort({ position: 1 }).toArray();
    }

    return res.status(200).json(matches);
  } catch (error) {
    console.error("Erro em getAllPartidas:", error);
    return res.status(500).json({ error: error.message });
  }
};

// GET /api/v1/partidas/:id
export const getPartidaById = async (req, res) => {
  const { id } = req.params;
  try {
    const match = await findMatchByIdOrCode(id);
    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }
    const roundsCol = await RoundRepository.getCollection();
    const rounds = await roundsCol.find({ matchId: match.code || match._id.toString() }).toArray();

    return res.status(200).json({ match, rounds });
  } catch (error) {
    console.error("Erro em getPartidaById:", error);
    return res.status(500).json({ error: error.message });
  }
};

// PATCH or POST /api/v1/partidas/:id/release
export const toggleReleaseMatch = async (req, res) => {
  const { id } = req.params;
  const { released } = req.body;

  try {
    const match = await findMatchByIdOrCode(id);
    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    const newReleased = typeof released === "boolean" ? released : !match.released;
    const col = await MatchRepository.getCollection();
    await col.updateOne({ _id: match._id }, { $set: { released: newReleased, updatedAt: new Date() } });

    const updated = await col.findOne({ _id: match._id });

    if (req.app.get("io")) {
      const io = req.app.get("io");
      io.emit("match:updated", updated);
    }

    return res.status(200).json({ message: "Status de exibição atualizado com sucesso.", match: updated });
  } catch (error) {
    console.error("Erro em toggleReleaseMatch:", error);
    return res.status(500).json({ error: error.message });
  }
};

// POST /api/v1/partidas/:id/winner
export const setMatchWinner = async (req, res) => {
  const { id } = req.params;
  const { winningTeam, team1Score, team2Score } = req.body; // winningTeam: 1 | 2

  try {
    const match = await findMatchByIdOrCode(id);
    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    const t1Wins = winningTeam === 1;
    const winnerObj = t1Wins ? match.team1 : match.team2;
    const s1 = team1Score !== undefined ? team1Score : (t1Wins ? 2 : 0);
    const s2 = team2Score !== undefined ? team2Score : (t1Wins ? 0 : 2);

    const col = await MatchRepository.getCollection();

    // 1. Update this match
    await col.updateOne(
      { _id: match._id },
      {
        $set: {
          status: "CONCLUÍDO",
          released: true, // Automatically release on winner confirmation!
          winnerId: winnerObj?.id || (t1Wins ? "teamA" : "teamB"),
          winnerName: winnerObj?.name || "Vencedor",
          "team1.score": s1,
          "team1.winner": t1Wins,
          "team2.score": s2,
          "team2.winner": !t1Wins,
          updatedAt: new Date()
        }
      }
    );

    // 2. Cascade advance to next match if defined
    if (match.nextMatchCode) {
      const nextMatch = await col.findOne({ code: match.nextMatchCode });
      if (nextMatch) {
        const slotKey = match.nextMatchSlot === 1 ? "team1" : "team2";
        const slotIdKey = match.nextMatchSlot === 1 ? "team1Id" : "team2Id";

        await col.updateOne(
          { _id: nextMatch._id },
          {
            $set: {
              [slotIdKey]: winnerObj?.id || null,
              [slotKey]: {
                id: winnerObj?.id || null,
                name: winnerObj?.name || "Vencedor",
                code: winnerObj?.code || "",
                robot: winnerObj?.robot || "",
                seed: winnerObj?.seed || "",
                score: 0,
                winner: false
              },
              updatedAt: new Date()
            }
          }
        );
      }
    }

    const updatedMatch = await col.findOne({ _id: match._id });
    const allMatches = await col.find({}).sort({ position: 1 }).toArray();

    if (req.app.get("io")) {
      const io = req.app.get("io");
      io.emit("matches:updated", allMatches);
    }

    return res.status(200).json({
      message: `Vitória de ${winnerObj?.name} confirmada! Avançado para a próxima fase.`,
      match: updatedMatch,
      matches: allMatches
    });
  } catch (error) {
    console.error("Erro em setMatchWinner:", error);
    return res.status(500).json({ error: error.message });
  }
};

// POST /api/v1/Rouds/partidas/:matchId/rounds (or /api/v1/partidas/:matchId/rounds)
export const handleAddRound = async (req, res) => {
  const { matchId } = req.params;
  const {
    winnerId,
    duration,
    team1ActiveDuration,
    team2ActiveDuration,
    isExtraRound,
    round1Winner,
    round2Winner,
    round3Winner,
    round1Duration,
    round2Duration,
    round3Duration
  } = req.body;

  try {
    const match = await findMatchByIdOrCode(matchId);
    if (!match) {
      return res.status(404).json({ error: "Partida não encontrada." });
    }

    const roundCol = await RoundRepository.getCollection();
    const matchIdStr = match.code || match._id.toString();

    // Clean previous rounds if re-evaluating
    await roundCol.deleteMany({ matchId: matchIdStr });

    const roundDocs = [];

    if (round1Winner) {
      const r1 = {
        matchId: matchIdStr,
        numero: 1,
        winnerId: round1Winner === "teamA" ? match.team1?.id || "teamA" : round1Winner === "teamB" ? match.team2?.id || "teamB" : "draw",
        duration: round1Duration !== undefined ? round1Duration : (duration || 60),
        isExtraRound: false,
        createdAt: new Date()
      };
      await roundCol.insertOne(r1);
      roundDocs.push(r1);
    }

    if (round2Winner) {
      const r2 = {
        matchId: matchIdStr,
        numero: 2,
        winnerId: round2Winner === "teamA" ? match.team1?.id || "teamA" : round2Winner === "teamB" ? match.team2?.id || "teamB" : "draw",
        duration: round2Duration !== undefined ? round2Duration : (duration || 60),
        isExtraRound: false,
        createdAt: new Date()
      };
      await roundCol.insertOne(r2);
      roundDocs.push(r2);
    }

    if (round3Winner) {
      const r3 = {
        matchId: matchIdStr,
        numero: 3,
        winnerId: round3Winner === "teamA" ? match.team1?.id || "teamA" : round3Winner === "teamB" ? match.team2?.id || "teamB" : "draw",
        duration: round3Duration !== undefined ? round3Duration : (duration || 60),
        isExtraRound: true,
        createdAt: new Date()
      };
      await roundCol.insertOne(r3);
      roundDocs.push(r3);
    }

    // Calculate round scores from rounds
    let t1Wins = 0;
    let t2Wins = 0;

    if (round1Winner) {
      if (round1Winner === "teamA") t1Wins++;
      if (round1Winner === "teamB") t2Wins++;
    }
    if (round2Winner) {
      if (round2Winner === "teamA") t1Wins++;
      if (round2Winner === "teamB") t2Wins++;
    }
    if (round3Winner) {
      if (round3Winner === "teamA") t1Wins++;
      if (round3Winner === "teamB") t2Wins++;
    }

    // If explicit winnerId passed from evaluation
    if (t1Wins === 0 && t2Wins === 0) {
      if (winnerId && (winnerId === match.team1?.id || winnerId === "teamA")) {
        t1Wins = 2;
        t2Wins = 0;
      } else if (winnerId && (winnerId === match.team2?.id || winnerId === "teamB")) {
        t1Wins = 0;
        t2Wins = 2;
      } else {
        t1Wins = 2; // Default to team 1 if not specified
      }
    }

    const winningTeam = t1Wins >= t2Wins ? 1 : 2;
    const winnerObj = winningTeam === 1 ? match.team1 : match.team2;

    const matchCol = await MatchRepository.getCollection();

    // Update match to CONCLUÍDO and automatically RELEASED
    await matchCol.updateOne(
      { _id: match._id },
      {
        $set: {
          status: "CONCLUÍDO",
          released: true, // Crucial: publish immediately upon judge confirmation!
          winnerId: winnerObj?.id || (winningTeam === 1 ? "teamA" : "teamB"),
          winnerName: winnerObj?.name || "Vencedor",
          "team1.score": t1Wins,
          "team1.winner": winningTeam === 1,
          "team2.score": t2Wins,
          "team2.winner": winningTeam === 2,
          round1Duration: round1Duration !== undefined ? round1Duration : null,
          round2Duration: round2Duration !== undefined ? round2Duration : null,
          round3Duration: round3Duration !== undefined ? round3Duration : null,
          rounds: roundDocs,
          updatedAt: new Date()
        }
      }
    );

    // Cascade advance to next round in bracket
    if (match.nextMatchCode) {
      const nextMatch = await matchCol.findOne({ code: match.nextMatchCode });
      if (nextMatch) {
        const slotKey = match.nextMatchSlot === 1 ? "team1" : "team2";
        const slotIdKey = match.nextMatchSlot === 1 ? "team1Id" : "team2Id";

        await matchCol.updateOne(
          { _id: nextMatch._id },
          {
            $set: {
              [slotIdKey]: winnerObj?.id || null,
              [slotKey]: {
                id: winnerObj?.id || null,
                name: winnerObj?.name || "Vencedor",
                code: winnerObj?.code || "",
                robot: winnerObj?.robot || "",
                seed: winnerObj?.seed || "",
                score: 0,
                winner: false
              },
              updatedAt: new Date()
            }
          }
        );
      }
    }

    const updatedMatch = await matchCol.findOne({ _id: match._id });
    const allMatches = await matchCol.find({}).sort({ position: 1 }).toArray();

    if (req.app.get("io")) {
      const io = req.app.get("io");
      io.emit("matches:updated", allMatches);
    }

    return res.status(201).json({
      message: "Round registrado com sucesso!",
      round: roundDocs[roundDocs.length - 1] || null,
      rounds: roundDocs,
      match: updatedMatch,
      matches: allMatches,
      matchFinished: true,
      winnerId: winnerObj?.id
    });
  } catch (error) {
    console.error("Erro em handleAddRound:", error);
    return res.status(500).json({ error: error.message });
  }
};

// POST /api/v1/partidas/release-all
export const releaseAllPartidas = async (req, res) => {
  try {
    const col = await MatchRepository.getCollection();
    await col.updateMany({}, { $set: { released: true, updatedAt: new Date() } });
    const matches = await col.find({}).sort({ position: 1 }).toArray();

    if (req.app.get("io")) {
      const io = req.app.get("io");
      io.emit("matches:updated", matches);
    }

    return res.status(200).json({ message: "Todas as partidas foram liberadas para o telão.", matches });
  } catch (error) {
    console.error("Erro em releaseAllPartidas:", error);
    return res.status(500).json({ error: error.message });
  }
};

// POST /api/v1/partidas/hide-all
export const hideAllPartidas = async (req, res) => {
  try {
    const col = await MatchRepository.getCollection();
    await col.updateMany({}, { $set: { released: false, updatedAt: new Date() } });
    const matches = await col.find({}).sort({ position: 1 }).toArray();

    if (req.app.get("io")) {
      const io = req.app.get("io");
      io.emit("matches:updated", matches);
    }

    return res.status(200).json({ message: "Todos os resultados foram ocultados do telão.", matches });
  } catch (error) {
    console.error("Erro em hideAllPartidas:", error);
    return res.status(500).json({ error: error.message });
  }
};

// POST /api/v1/partidas/reset-sorteio
export const resetSorteio = async (req, res) => {
  try {
    await seedTournament();
    const col = await MatchRepository.getCollection();
    const matches = await col.find({}).sort({ position: 1 }).toArray();

    if (req.app.get("io")) {
      const io = req.app.get("io");
      io.emit("matches:updated", matches);
    }

    return res.status(200).json({ message: "Sorteio resetado e chaves geradas com sucesso!", matches });
  } catch (error) {
    console.error("Erro em resetSorteio:", error);
    return res.status(500).json({ error: error.message });
  }
};
