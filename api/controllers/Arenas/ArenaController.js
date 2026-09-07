import { ArenaRepository, toObjectId } from "../../repositories/dbRepository.js";

const DEFAULT_ARENAS = [
  {
    name: "Labirinto",
    description: "Arena de percurso com obstáculos dinâmicos para robôs seguidores de linha e desafios de navegação autônoma.",
    status: "Ativa",
    capacity: 48,
    dimensions: "10m × 10m",
    noiseLevel: "Baixo",
    lighting: "Artificial",
    validationType: "Automática",
    restrictedAccess: false,
    requiresJudge: true,
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
    teams: [
      { id: "t1", name: "Cyber-Dragons", institution: "SENAC SP", status: "Aprovado" },
      { id: "t2", name: "Robo-Tech", institution: "FATEC Campinas", status: "Aprovado" },
      { id: "t3", name: "Iron Bots", institution: "ETEC Zona Sul", status: "Pendente" },
    ],
    createdAt: new Date(),
  },
  {
    name: "Grand Prix",
    description: "Circuito de alta velocidade para competição de precisão e velocidade em pistas sinalizadas.",
    status: "Ativa",
    capacity: 64,
    dimensions: "15m × 8m",
    noiseLevel: "Alto",
    lighting: "Mista",
    validationType: "Manual",
    restrictedAccess: true,
    requiresJudge: true,
    image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
    teams: [
      { id: "t4", name: "Speed Demons", institution: "SENAC RJ", status: "Aprovado" },
      { id: "t5", name: "Turbo Coders", institution: "FATEC Santos", status: "Rejeitado" },
      { id: "t6", name: "Nitro Bots", institution: "ETEC Centro", status: "Pendente" },
    ],
    createdAt: new Date(),
  },
  {
    name: "Arena Beta-2",
    description: "Zona experimental para categorias de dança e apresentação artística com robôs coreografados.",
    status: "Inativa",
    capacity: 32,
    dimensions: "8m × 8m",
    noiseLevel: "Médio",
    lighting: "Natural",
    validationType: "Automática",
    restrictedAccess: false,
    requiresJudge: false,
    image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800",
    teams: [
      { id: "t7", name: "DanceBots", institution: "SENAC MG", status: "Pendente" },
    ],
    createdAt: new Date(),
  },
];

const formatArena = (doc) => ({
  id: doc._id.toString(),
  name: doc.name,
  description: doc.description || "",
  status: doc.status || "Ativa",
  capacity: Number(doc.capacity) || 32,
  dimensions: doc.dimensions || "10m × 10m",
  noiseLevel: doc.noiseLevel || "Baixo",
  lighting: doc.lighting || "Artificial",
  validationType: doc.validationType || "Automática",
  restrictedAccess: Boolean(doc.restrictedAccess),
  requiresJudge: Boolean(doc.requiresJudge),
  image: doc.image || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
  teams: Array.isArray(doc.teams) ? doc.teams : [],
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const getArenas = async (req, res) => {
  try {
    let arenas = await ArenaRepository.find({});
    if (!arenas || arenas.length === 0) {
      // Seed default arenas if database has none
      for (const def of DEFAULT_ARENAS) {
        await ArenaRepository.insertOne({ ...def, createdAt: new Date() });
      }
      arenas = await ArenaRepository.find({});
    }

    return res.status(200).json(arenas.map(formatArena));
  } catch (error) {
    console.error("Erro ao buscar arenas:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const getArenaById = async (req, res) => {
  try {
    const { id } = req.params;
    const arena = await ArenaRepository.findOne({ _id: id });
    if (!arena) {
      return res.status(404).json({ error: "Arena não encontrada" });
    }
    return res.status(200).json(formatArena(arena));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

export const createArena = async (req, res) => {
  try {
    const {
      name,
      description,
      status = "Ativa",
      capacity = 32,
      dimensions = "10m × 10m",
      noiseLevel = "Baixo",
      lighting = "Artificial",
      validationType = "Automática",
      restrictedAccess = false,
      requiresJudge = false,
      image = "",
      teams = [],
    } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: "Nome e descrição são obrigatórios." });
    }

    const newArena = await ArenaRepository.insertOne({
      name,
      description,
      status,
      capacity: Number(capacity) || 32,
      dimensions,
      noiseLevel,
      lighting,
      validationType,
      restrictedAccess: Boolean(restrictedAccess),
      requiresJudge: Boolean(requiresJudge),
      image: image || "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800",
      teams: Array.isArray(teams) ? teams : [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return res.status(201).json(formatArena(newArena));
  } catch (error) {
    console.error("Erro ao criar arena:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const updateArena = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      status,
      capacity,
      dimensions,
      noiseLevel,
      lighting,
      validationType,
      restrictedAccess,
      requiresJudge,
      image,
    } = req.body;

    const updateDoc = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateDoc.name = name;
    if (description !== undefined) updateDoc.description = description;
    if (status !== undefined) updateDoc.status = status;
    if (capacity !== undefined) updateDoc.capacity = Number(capacity);
    if (dimensions !== undefined) updateDoc.dimensions = dimensions;
    if (noiseLevel !== undefined) updateDoc.noiseLevel = noiseLevel;
    if (lighting !== undefined) updateDoc.lighting = lighting;
    if (validationType !== undefined) updateDoc.validationType = validationType;
    if (restrictedAccess !== undefined) updateDoc.restrictedAccess = Boolean(restrictedAccess);
    if (requiresJudge !== undefined) updateDoc.requiresJudge = Boolean(requiresJudge);
    if (image !== undefined) updateDoc.image = image;

    await ArenaRepository.updateOne({ _id: id }, { $set: updateDoc });
    const updated = await ArenaRepository.findOne({ _id: id });
    if (!updated) {
      return res.status(404).json({ error: "Arena não encontrada" });
    }

    return res.status(200).json(formatArena(updated));
  } catch (error) {
    console.error("Erro ao atualizar arena:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const deleteArena = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await ArenaRepository.deleteOne({ _id: id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Arena não encontrada" });
    }
    return res.status(200).json({ message: "Arena excluída com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir arena:", error);
    return res.status(500).json({ error: error.message });
  }
};

export const updateArenaTeams = async (req, res) => {
  try {
    const { id } = req.params;
    const { teams } = req.body;

    if (!Array.isArray(teams)) {
      return res.status(400).json({ error: "O campo teams deve ser uma lista." });
    }

    await ArenaRepository.updateOne(
      { _id: id },
      { $set: { teams, updatedAt: new Date() } }
    );

    const updated = await ArenaRepository.findOne({ _id: id });
    if (!updated) {
      return res.status(404).json({ error: "Arena não encontrada" });
    }

    return res.status(200).json(formatArena(updated));
  } catch (error) {
    console.error("Erro ao atualizar equipes da arena:", error);
    return res.status(500).json({ error: error.message });
  }
};
