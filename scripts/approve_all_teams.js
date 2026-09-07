import { TeamRepository } from "../api/repositories/dbRepository.js";

const official8SumoTeams = [
  { nome: 'CyberKnights', robot: 'CyberKnight v1', teamId: '#RA-2026-621' },
  { nome: 'RoboTigers', robot: 'TigerClaw v2', teamId: '#RA-2026-717' },
  { nome: 'Iron Sparks', robot: 'SparkDestroyer', teamId: '#RA-2026-288' },
  { nome: 'Delta Force', robot: 'DeltaForce X', teamId: '#RA-2026-797' },
  { nome: 'Equipe Titãs', robot: 'Destruidor v3', teamId: '#RA-2026-558' },
  { nome: 'Cyber Ninjas', robot: 'Shadow Blade v3', teamId: '#RA-2026-582' },
  { nome: 'Nexus Bots', robot: 'Nexus Crusher', teamId: '#RA-2026-831' },
  { nome: 'Omega Core', robot: 'CoreBreaker', teamId: '#RA-2026-463' },
];

async function main() {
  const col = await TeamRepository.getCollection();
  await col.deleteMany({});

  for (let i = 0; i < official8SumoTeams.length; i++) {
    const t = official8SumoTeams[i];
    const members = [
      { id: `m-${i + 1}-1`, name: `${t.nome} Líder`, role: 'Líder Técnico', docStatus: 'approved' },
      { id: `m-${i + 1}-2`, name: `${t.nome} Programador`, role: 'Engenheiro de Software', docStatus: 'approved' },
      { id: `m-${i + 1}-3`, name: `${t.nome} Mecânico`, role: 'Engenheiro Mecânico', docStatus: 'approved' }
    ];

    await col.insertOne({
      nome: t.nome,
      fullName: t.nome,
      teamId: t.teamId,
      robot: t.robot,
      status: 'APROVADO',
      category: 'Sumô',
      categoria: 'Sumô',
      arena: 'Arena 01 - Sumô',
      arenas: [{ name: 'Arena 01 - Sumô', confirmed: true }],
      members: members,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  const count = await col.countDocuments({});
  console.log(`Successfully configured ${count} official Sumô teams in MongoDB Atlas!`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

