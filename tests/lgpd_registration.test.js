import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createUser } from '../api/controllers/users/Create.js';
import { getDb } from '../api/db.js';

describe('LGPD & User Registration Integration', () => {
  it('deve rejeitar cadastro caso os termos da LGPD não sejam aceitos', async () => {
    let statusCode = null;
    let responseBody = null;

    const req = {
      body: {
        name: 'Aluno Teste',
        email: 'aluno_recusa_lgpd@senac.edu.br',
        password: 'senhaSegura123!',
        cargo: 'ALUNO',
        lgpdAccepted: false
      },
      headers: {},
      ip: '127.0.0.1'
    };

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      }
    };

    await createUser(req, res);

    assert.strictEqual(statusCode, 400);
    assert.ok(responseBody.error.includes('LGPD'), 'Mensagem de erro deve citar LGPD');
  });

  it('deve rejeitar cadastro se o campo lgpdAccepted for omitido', async () => {
    let statusCode = null;
    let responseBody = null;

    const req = {
      body: {
        name: 'Aluno Teste 2',
        email: 'aluno_sem_lgpd@senac.edu.br',
        password: 'senhaSegura123!',
        cargo: 'ALUNO'
      },
      headers: {},
      ip: '127.0.0.1'
    };

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      }
    };

    await createUser(req, res);

    assert.strictEqual(statusCode, 400);
    assert.ok(responseBody.error.includes('LGPD'), 'Deve exigir termos da LGPD');
  });

  it('deve rejeitar cadastro se lgpdAccepted for string inválida', async () => {
    let statusCode = null;
    let responseBody = null;

    const req = {
      body: {
        name: 'Aluno Teste 3',
        email: 'aluno_invalid_lgpd@senac.edu.br',
        password: 'senhaSegura123!',
        cargo: 'ALUNO',
        lgpdAccepted: 'invalid_value'
      },
      headers: {},
      ip: '127.0.0.1'
    };

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      }
    };

    await createUser(req, res);

    assert.strictEqual(statusCode, 400);
    assert.ok(responseBody.error.includes('LGPD'), 'Deve rejeitar string não-booleana');
  });

  it('deve registrar usuário com sucesso e salvar dados de LGPD no banco de dados', async () => {
    let statusCode = null;
    let responseBody = null;

    const timestamp = Date.now();
    const testEmail = `aluno_lgpd_${timestamp}@senac.edu.br`;

    const req = {
      body: {
        name: 'Aluno Conformidade LGPD',
        email: testEmail,
        password: 'senhaForte123@#',
        cargo: 'ALUNO',
        cpf: '123.456.789-01',
        institution: 'SENAC Hub Academy',
        lgpdAccepted: true,
        lgpdAcceptedAt: new Date().toISOString(),
        lgpdVersion: '1.0'
      },
      headers: {
        'x-forwarded-for': '192.168.1.100, 10.0.0.1',
        'user-agent': 'Mozilla/5.0 TorneioSumoClient/1.0'
      },
      ip: '10.0.0.1'
    };

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        return this;
      }
    };

    await createUser(req, res);

    assert.strictEqual(statusCode, 201, 'Deve retornar HTTP 201');
    assert.strictEqual(responseBody.lgpdAccepted, true, 'Resposta deve confirmar lgpdAccepted');
    assert.ok(responseBody.userId, 'Deve retornar userId gerado');
    assert.strictEqual(responseBody.termosLgpd.aceito, true, 'Resposta deve conter termosLgpd');

    // Validar diretamente no banco de dados
    const db = await getDb();
    const savedUser = await db.collection('users').findOne({ email: testEmail });

    assert.ok(savedUser, 'Usuário deve existir no banco de dados');
    assert.strictEqual(savedUser.lgpdAccepted, true, 'Banco deve conter lgpdAccepted = true');
    assert.ok(savedUser.lgpdAcceptedAt instanceof Date, 'lgpdAcceptedAt deve ser uma data válida');
    assert.strictEqual(savedUser.lgpdVersion, '1.0', 'lgpdVersion deve ser 1.0');
    assert.strictEqual(savedUser.cpf, '12345678901', 'CPF deve ser sanitizado para dígitos');
    assert.strictEqual(savedUser.institution, 'SENAC Hub Academy', 'Instituição deve ser salva');
    assert.strictEqual(savedUser.termosLgpd.aceito, true, 'termosLgpd.aceito deve ser true');
    assert.strictEqual(savedUser.termosLgpd.ip, '192.168.1.100', 'termosLgpd.ip deve extrair o primeiro IP de x-forwarded-for');
    assert.strictEqual(savedUser.termosLgpd.userAgent, 'Mozilla/5.0 TorneioSumoClient/1.0', 'termosLgpd deve registrar o userAgent');
  });
});
