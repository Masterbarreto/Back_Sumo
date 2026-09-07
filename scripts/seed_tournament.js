import {
  TeamRepository,
  TournamentRepository,
  MatchRepository,
  RoundRepository,
  EnrollmentRepository,
} from "../api/repositories/dbRepository.js";
import { ObjectId } from "mongodb";

export const official16SumoTeams = [
  { nome: 'CyberKnights', robot: 'CyberKnight v1', teamId: '#TM-1042', seed: 'A1' },
  { nome: 'RoboTigers', robot: 'TigerClaw v2', teamId: '#TM-2091', seed: 'B4' },
  { nome: 'Iron Sparks', robot: 'SparkDestroyer', teamId: '#TM-3301', seed: 'C2' },
  { nome: 'Delta Force', robot: 'DeltaForce X', teamId: '#TM-0084', seed: 'D3' },
  { nome: 'Nexus Bots', robot: 'Nexus Crusher', teamId: '#TM-1122', seed: 'E1' },
  { nome: 'Omega Core', robot: 'CoreBreaker', teamId: '#TM-4050', seed: 'F2' },
  { nome: 'Equipe Titãs', robot: 'Destruidor v3', teamId: '#TM-5580', seed: 'G1' },
  { nome: 'Cyber Ninjas', robot: 'Shadow Blade v3', teamId: '#TM-5820', seed: 'H2' },
  { nome: 'AlphaBot', robot: 'Alpha Destroyer', teamId: '#TM-6101', seed: 'I1' },
  { nome: 'TechKnights', robot: 'Knight Rider v2', teamId: '#TM-6202', seed: 'J2' },
  { nome: 'MechEng', robot: 'Mech Smasher', teamId: '#TM-7303', seed: 'K1' },
  { nome: 'Phoenix Force', robot: 'FireStorm v1', teamId: '#TM-7404', seed: 'L2' },
  { nome: 'Thunder Bolt', robot: 'Lightning Bot', teamId: '#TM-8505', seed: 'M1' },
  { nome: 'Vortex Prime', robot: 'Vortex Blade', teamId: '#TM-8606', seed: 'N2' },
  { nome: 'Atomic Samurai', robot: 'Katana Strike', teamId: '#TM-9707', seed: 'O1' },
  { nome: 'Titan Crusher', robot: 'Crusher Max', teamId: '#TM-9808', seed: 'P2' },
];

export async function seedTournament() {
  console.log("Iniciando seed do Torneio de Sumô no MongoDB Atlas...");

  // 1. Teams
  const teamCol = await TeamRepository.getCollection();
  await teamCol.deleteMany({});

  const insertedTeams = [];
  for (let i = 0; i < official16SumoTeams.length; i++) {
    const t = official16SumoTeams[i];
    const members = [
      { id: `m-${i + 1}-1`, name: `${t.nome} Líder`, role: 'Líder Técnico', docStatus: 'approved' },
      { id: `m-${i + 1}-2`, name: `${t.nome} Programador`, role: 'Engenheiro de Software', docStatus: 'approved' },
      { id: `m-${i + 1}-3`, name: `${t.nome} Mecânico`, role: 'Engenheiro Mecânico', docStatus: 'approved' }
    ];

    const teamDoc = await teamCol.insertOne({
      nome: t.nome,
      fullName: t.nome,
      name: t.nome,
      teamId: t.teamId,
      robot: t.robot,
      seed: t.seed,
      status: 'APROVADO',
      category: 'Sumô',
      categoria: 'Sumô',
      arena: 'Arena 01 - Sumô',
      arenas: [{ name: 'Arena 01 - Sumô', confirmed: true }],
      members: members,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    insertedTeams.push({
      _id: teamDoc.insertedId.toString(),
      nome: t.nome,
      teamId: t.teamId,
      robot: t.robot,
      seed: t.seed
    });
  }
  console.log(`✅ 16 equipes inseridas no MongoDB!`);

  // 2. Tournament
  const tournCol = await TournamentRepository.getCollection();
  await tournCol.deleteMany({});
  const tournResult = await tournCol.insertOne({
    nome: "Torneio Sumô 2026 - Edição Oficial",
    modalidade: "Sumô",
    category: "Sumô",
    status: "EM_ANDAMENTO",
    faseAtual: "OITAVAS",
    createdAt: new Date(),
    updatedAt: new Date()
  });
  const tournamentId = tournResult.insertedId.toString();

  // 3. Clear Rounds & Enrollments
  const roundCol = await RoundRepository.getCollection();
  await roundCol.deleteMany({});
  const enrollCol = await EnrollmentRepository.getCollection();
  await enrollCol.deleteMany({});

  for (const it of insertedTeams) {
    await enrollCol.insertOne({
      tournamentId,
      teamId: it._id,
      status: "APROVADA",
      createdAt: new Date()
    });
  }

  // 4. Create 15 Bracket Matches
  const matchCol = await MatchRepository.getCollection();
  await matchCol.deleteMany({});

  // 8 Oitavas de Final
  const oitavas = [
    { code: 'MCH-001', phase: 'OITAVAS', position: 1, t1: insertedTeams[0], t2: insertedTeams[1], nextMatch: 'MCH-009', nextSlot: 1 },
    { code: 'MCH-002', phase: 'OITAVAS', position: 2, t1: insertedTeams[2], t2: insertedTeams[3], nextMatch: 'MCH-009', nextSlot: 2 },
    { code: 'MCH-003', phase: 'OITAVAS', position: 3, t1: insertedTeams[4], t2: insertedTeams[5], nextMatch: 'MCH-010', nextSlot: 1 },
    { code: 'MCH-004', phase: 'OITAVAS', position: 4, t1: insertedTeams[6], t2: insertedTeams[7], nextMatch: 'MCH-010', nextSlot: 2 },
    { code: 'MCH-005', phase: 'OITAVAS', position: 5, t1: insertedTeams[8], t2: insertedTeams[9], nextMatch: 'MCH-011', nextSlot: 1 },
    { code: 'MCH-006', phase: 'OITAVAS', position: 6, t1: insertedTeams[10], t2: insertedTeams[11], nextMatch: 'MCH-011', nextSlot: 2 },
    { code: 'MCH-007', phase: 'OITAVAS', position: 7, t1: insertedTeams[12], t2: insertedTeams[13], nextMatch: 'MCH-012', nextSlot: 1 },
    { code: 'MCH-008', phase: 'OITAVAS', position: 8, t1: insertedTeams[14], t2: insertedTeams[15], nextMatch: 'MCH-012', nextSlot: 2 },
  ];

  // 4 Quartas de Final
  const quartas = [
    { code: 'MCH-009', phase: 'QUARTAS', position: 9, t1: null, t2: null, nextMatch: 'MCH-013', nextSlot: 1 },
    { code: 'MCH-010', phase: 'QUARTAS', position: 10, t1: null, t2: null, nextMatch: 'MCH-013', nextSlot: 2 },
    { code: 'MCH-011', phase: 'QUARTAS', position: 11, t1: null, t2: null, nextMatch: 'MCH-014', nextSlot: 1 },
    { code: 'MCH-012', phase: 'QUARTAS', position: 12, t1: null, t2: null, nextMatch: 'MCH-014', nextSlot: 2 },
  ];

  // 2 Semifinais
  const semis = [
    { code: 'MCH-013', phase: 'SEMIFINAL', position: 13, t1: null, t2: null, nextMatch: 'MCH-015', nextSlot: 1 },
    { code: 'MCH-014', phase: 'SEMIFINAL', position: 14, t1: null, t2: null, nextMatch: 'MCH-015', nextSlot: 2 },
  ];

  // 1 Grande Final
  const finalMatch = [
    { code: 'MCH-015', phase: 'FINAL', position: 15, t1: null, t2: null, nextMatch: null, nextSlot: null },
  ];

  const allMatchDefs = [...oitavas, ...quartas, ...semis, ...finalMatch];

  for (const m of allMatchDefs) {
    const isLive = m.code === 'MCH-003';

    await matchCol.insertOne({
      code: m.code,
      customId: m.code,
      tournamentId,
      phase: m.phase,
      position: m.position,
      team1Id: m.t1?._id || null,
      team2Id: m.t2?._id || null,
      team1: m.t1
        ? {
            id: m.t1._id,
            name: m.t1.nome,
            code: m.t1.teamId,
            robot: m.t1.robot,
            seed: m.t1.seed,
            score: 0,
            winner: false,
          }
        : { name: 'AGUARDANDO...', score: '--' },
      team2: m.t2
        ? {
            id: m.t2._id,
            name: m.t2.nome,
            code: m.t2.teamId,
            robot: m.t2.robot,
            seed: m.t2.seed,
            score: 0,
            winner: false,
          }
        : { name: 'AGUARDANDO...', score: '--' },
      winnerId: null,
      winnerName: null,
      status: isLive ? 'EM ANDAMENTO' : 'PENDENTE',
      released: false,
      nextMatchCode: m.nextMatch,
      nextMatchSlot: m.nextSlot,
      rounds: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  const count = await matchCol.countDocuments({});
  console.log(`✅ ${count} partidas criadas com sucesso no MongoDB Atlas!`);
  return { tournamentId, teamCount: insertedTeams.length, matchCount: count };
}

if (process.argv[1]?.includes('seed_tournament.js')) {
  seedTournament()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
