import yup from "yup";

export const UserSchema = yup.object().shape({
  nome: yup.string().required(),
  email: yup.string().email().required(),
  senha_hash: yup.string().required(),
  role: yup.string().oneOf(["PROFESSOR", "ALUNO"]).required(),
});

export const TeamSchema = yup.object().shape({
  nome: yup.string().required(),
  criadorId: yup.string().required(), // UserId of who created it
  membros: yup.array().of(
    yup.object().shape({
      nome: yup.string().required(),
      email: yup.string().email().required(),
      cpf: yup.string().required(),
      rg: yup.string(),
      birthDate: yup.string(),
      role: yup.string().default("Competidor"),
      docStatus: yup.string().oneOf(["pending", "docs_ok", "awaiting", "awaiting_review", "awaiting_resend", "approved"]).default("pending"),
    })
  ).required(),
});

export const TournamentSchema = yup.object().shape({
  nome: yup.string().required(),
  status: yup.string().oneOf(["RASCUNHO", "INSCRICOES_ABERTAS", "CHAVEAMENTO_PRONTO", "EM_ANDAMENTO", "FINALIZADO"]).default("RASCUNHO"),
  createdAt: yup.date().default(() => new Date()),
});

export const EnrollmentSchema = yup.object().shape({
  tournamentId: yup.string().required(),
  teamId: yup.string().required(),
  status: yup.string().oneOf(["PENDENTE", "APROVADA"]).default("PENDENTE"),
});

export const MatchSchema = yup.object().shape({
  tournamentId: yup.string().required(),
  phase: yup.string().required(),
  team1Id: yup.string().nullable(),
  team2Id: yup.string().nullable(),
  winnerId: yup.string().nullable(),
  status: yup.string().oneOf(["PENDENTE", "EM_ANDAMENTO", "FINALIZADO"]).default("PENDENTE"),
  nextMatchId: yup.string().nullable(),
});

export const RoundSchema = yup.object().shape({
  matchId: yup.string().required(),
  numero: yup.number().integer().positive().required(),
  winnerId: yup.string().nullable(),
  duration: yup.number().nullable(),
  notes: yup.string().nullable(),
});
