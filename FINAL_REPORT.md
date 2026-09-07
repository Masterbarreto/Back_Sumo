# Relatório de Arquitetura & Integração Final

## Projeto: Sistema de Gerenciamento do Torneio de Robótica (Sumô)

Este relatório consolida o desenvolvimento, integração e validação técnica da API do Torneio de Sumô, conectando o backend Node.js/Express ao frontend React/Vite.

---

## 1. Arquitetura do Sistema e Organização de Módulos

O backend foi reestruturado seguindo os princípios de SOLID e Clean Architecture, garantindo alta separação de responsabilidades (SoC) e resiliência:

- **`db.js`:** Ponto único de conexão com o driver nativo `mongodb`. Conta com uma funcionalidade de **banco de dados em memória (`MockDb`)** auto-inicializada em desenvolvimento local caso a conexão com a URI falhe.
- **`dbRepository.js`:** Encapsula todas as operações de banco de dados (`findOne`, `find`, `insertOne`, `updateOne`, `deleteOne`, etc.) por coleção, realizando conversões transparentes de strings hexadecimais para `ObjectId`.
- **`authenticate.js`:** Extrai e descriptografa tokens JWT diretamente do cookie de sessão `req.cookies.token` do cliente, validando perfis e garantindo proteção a rotas restritas.
- **`TeamController.js`:** Gerencia a criação de equipes, inserção e documentação de membros técnicos (limite de 5 competidores) e histórico de auditoria técnica.
- **`TournamentController.js`:** Motor do torneio que abrange:
  - Cadastro de competições e inscrições.
  - **Gerador de Chaveamento Inteligente com BYEs:** Identifica as equipes qualificadas, randomiza os confrontos e constrói a árvore matemática apontando para o `nextMatchId` correspondente, promovendo automaticamente quem recebeu BYE (folga).
  - **Motor de Partida (Melhor de Três):** Avalia as vitórias e resolve empates aplicando critérios oficiais (vitórias diretas, tempo médio de vitória e tempo ativo) até a declaração do vencedor.
- **`api/sockets/index.js`:** Gerencia conexões bidirecionais via Socket.IO, agregando clientes em salas indexadas pelo `tournamentId` para sincronização em tempo real das telas e cronômetros.

---

## 2. Protocolo de Sincronização em Tempo Real (WebSockets)

A comunicação em tempo real permite que a tela de projeção e a área administrativa permaneçam sincronizadas de forma instantânea sem necessidade de HTTP polling:

- **Conexão & Divisão por Salas:** No momento do carregamento da tela de partidas (`PartidasPage.tsx`) e projeção (`ProjectionReceiver.tsx`), o cliente se conecta ao Socket.IO do backend e emite o evento `join:tournament` passando o parâmetro `tournamentId`. O backend o insere na sala correspondente.
- **Emissão de Eventos de Projeção:** Quando o administrador altera o slide de projeção, o cronômetro, a categoria ou atualiza placares, o frontend envia o evento `projection:update` contendo o novo estado da projeção. O backend recebe o estado e retransmite o evento `projection:updated` para todos os outros clientes conectados na mesma sala.
- **Transição Automática:** Mudanças de status das partidas (`match:updated`) e novas rounds adicionados (`round:created`) são propagados em tempo real na árvore de torneio.

---

## 3. Relatório de Testes de Integração e Validação

Foram criados três scripts automatizados na pasta `scratch/` para verificar de forma rigorosa as regras de negócio:

### 3.1 Teste de Autenticação (`test_auth.js`)
- **Objetivo:** Garantir segurança de registro e assinatura de JWT cookies.
- **Fluxo:** Criação de usuário, captação automática do código de e-mail retornado na resposta em modo desenvolvimento, validação do código e teste de login.
- **Resultado:** **Passou com sucesso! ✅** Injeção de cookie HttpOnly confirmada no cabeçalho com flags SameSite e domínio.

### 3.2 Teste de Chaveamento & Equipes (`test_core.js`)
- **Objetivo:** Validar criação de equipes, aprovação de inscrições e algoritmo de BYEs.
- **Fluxo:** Setup de 3 equipes inscritas em um torneio.
- **Resultado:** **Passou com sucesso! ✅** Uma das equipes recebeu folga automática e avançou na árvore para a final, enquanto as outras duas foram colocadas em disputa ativa na semifinal. O campo `nextMatchId` foi gerado perfeitamente apontando as vitórias para os nós pais da árvore.

### 3.3 Teste de Motor de Combate (`test_match_engine.js`)
- **Objetivo:** Testar a regra Melhor de Três oficial e critérios automáticos de desempate.
- **Fluxo:** Simulação de 3 rounds consecutivos com empates regulamentares.
- **Resultado:** **Passou com sucesso! ✅** Conclusão da partida em placar 2x1 no Round 3 baseando-se no critério de maior tempo ativo do robô (40s vs 35s), seguido da promoção em tempo real para a grande final.

### 3.4 Testes de Concorrência
- **Objetivo:** Simular estresse de acessos paralelos simulando carregamento real de tráfego.
- **Fluxo:** 15 execuções simultâneas de rotas completas de cadastro, autenticação e registro de equipe rodando em concorrência via `Promise.all`.
- **Resultados:**
  - **Executores Simultâneos:** 15 usuários técnicos.
  - **Sucesso de Fluxos:** 100% (15 / 15).
  - **Duração Total:** 2.16 segundos.
  - **Velocidade Média:** 144 ms por usuário.
  - **Consistência:** Banco de dados finalizou sem registros corrompidos e sem conflitos de chaves exclusivas.

---

## 4. Instruções de Implantação e Produção (Production Check-List)

### 4.1 Requisitos do Ambiente de Produção
1. **Instância MongoDB:** Provisionar um cluster no MongoDB Atlas e obter a URI de produção (`mongodb+srv://...`).
2. **Ambiente Node.js:** Versão `>= 20.0.0` recomendada.
3. **Servidor:** Recomendado Render, Railway, Heroku ou VPS (DigitalOcean/AWS).

### 4.2 Configuração das Variáveis de Ambiente (`.env`)
Preencher no painel de configurações do servidor as seguintes chaves confidenciais:
```ini
NODE_ENV=production
PORT=443
MONGODB_URI=mongodb+srv://admin:<password>@cluster.mongodb.net/sumo_prod?retryWrites=true&w=majority
JWT_SECRET=InsiraUmaChaveAssinaturaSecretaSuperLongaeForte2026!
COOKIE_SECRET=InsiraOutraChaveSecretaForteParaSessaoCripto
CLIENT_URL=https://torneiosumo.vercel.app  # URL exata do frontend hospedado
COOKIE_DOMAIN=torneiosumo.vercel.app        # Domínio do frontend para que os cookies sejam compartilhados
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=seu-email-suporte@senac.edu.br
SMTP_PASSWORD=senha-de-aplicativo-google
```

### 4.3 Checklist de Segurança para Produção
- [ ] Certificar de que `NODE_ENV` está setado para `production`.
- [ ] Alterar em `Login.js` e `Verify.js` a propriedade do cookie `secure` para `true` (para exigir HTTPS obrigatório na transmissão do JWT).
- [ ] Garantir que o domínio configurado em `COOKIE_DOMAIN` coincide com o domínio do frontend sob o qual a aplicação rodará.
- [ ] Configurar chaves SMTP reais para disparo do e-mail com código de verificação para novos competidores e professores.
- [ ] Monitorar conexões simultâneas Socket.IO utilizando logs integrados.
