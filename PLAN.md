# Plano: FPS Match Log Parser - CloudWalk Challenge

## Visão Geral
Sistema para processar logs de partidas FPS, calcular rankings e exibir estatísticas com animação em tempo real.

---

## Layout da Tela (Visual)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FPS MATCH ANALYZER                          │
├──────────────┬──────────────────────────────────────────────────────┤
│              │                                                      │
│   HISTÓRICO  │              [  UPLOAD DE ARQUIVO  ]                 │
│              │                                                      │
│  ┌─────────┐ │  ════════════════════════════════════════════════    │
│  │ Match 1 │ │                   🏆 RANKING                         │
│  └─────────┘ │  ════════════════════════════════════════════════    │
│  ┌─────────┐ │                                                      │
│  │ Match 2 │ │   #   Player      Frags    Deaths    K/D             │
│  └─────────┘ │   ─────────────────────────────────────────          │
│  ┌─────────┐ │   1   Roman        5         1       5.0  ⭐         │
│  │ Match 3 │ │   2   Marcus       2         3       0.67            │
│  └─────────┘ │   3   Nick         0         2       0.0             │
│              │                                                      │
│              │  ════════════════════════════════════════════════    │
│              │                 ✨ HIGHLIGHTS                        │
│              │  ════════════════════════════════════════════════    │
│              │                                                      │
│              │   🔫 Arma favorita do vencedor: M16 (5 kills)        │
│              │                                                      │
│              │   🔥 Maior streak: Roman - 3 kills sem morrer        │
│              │                                                      │
│              │   🏅 Award FLAWLESS: Roman (venceu sem morrer)       │
│              │                                                      │
│              │   ⚡ Award FRENZY: Roman (5 kills em 1 min)          │
│              │                                                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

---

## Prioridade de Implementação

### Fase 1: Core (Resultado Esperado)
1. Parser de logs
2. Ranking da partida (frags + mortes)
3. Interface básica funcionando

### Fase 2: Highlights (Bônus visuais)
4. Arma favorita do vencedor
5. Maior streak
6. Award Flawless (venceu sem morrer)
7. Award Frenzy (5 kills em 1 min)

### Fase 3: Ranking Global
8. Persistência no banco
9. Ranking acumulado de todas partidas

### Fase 4: Times (Último)
10. Sistema de times
11. Friendly fire

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Backend | NestJS + TypeScript |
| Banco de Dados | SQLite (simples, sem setup) |
| Real-time | WebSocket (Socket.io) |
| Frontend | Handlebars (templates) + Vanilla JS + CSS |
| Deploy | Railway (free tier) |

---

## Arquitetura do Projeto

```
nomad/
├── src/
│   ├── core/                          # Domínio (Clean Architecture)
│   │   ├── entities/
│   │   │   ├── match.entity.ts        # Partida
│   │   │   ├── player.entity.ts       # Jogador
│   │   │   ├── kill-event.entity.ts   # Evento de kill
│   │   │   └── team.entity.ts         # Time (bônus)
│   │   │
│   │   └── use-cases/
│   │       ├── parse-log.use-case.ts              # Parsear arquivo de log
│   │       ├── calculate-ranking.use-case.ts      # Ranking da partida
│   │       ├── calculate-streak.use-case.ts       # Maior streak
│   │       ├── calculate-awards.use-case.ts       # Awards (sem morrer, 5 kills/min)
│   │       ├── get-favorite-weapon.use-case.ts    # Arma preferida do vencedor
│   │       ├── calculate-global-ranking.use-case.ts # Ranking global
│   │       └── process-friendly-fire.use-case.ts  # Friendly fire -1
│   │
│   ├── infra/                         # Infraestrutura
│   │   ├── database/
│   │   │   ├── sqlite.module.ts
│   │   │   └── repositories/
│   │   │       ├── match.repository.ts
│   │   │       └── player.repository.ts
│   │   │
│   │   └── parsers/
│   │       └── log-parser.service.ts  # Regex para parsear linhas
│   │
│   ├── modules/                       # Módulos NestJS
│   │   ├── match/
│   │   │   ├── match.module.ts
│   │   │   ├── match.controller.ts
│   │   │   └── match.service.ts
│   │   │
│   │   ├── upload/
│   │   │   ├── upload.module.ts
│   │   │   └── upload.controller.ts
│   │   │
│   │   └── websocket/
│   │       └── ranking.gateway.ts     # WebSocket para animação
│   │
│   └── views/                         # Templates Handlebars
│       ├── layouts/
│       │   └── main.hbs
│       ├── index.hbs                  # Página principal
│       └── partials/
│           ├── sidebar.hbs            # Histórico de entradas
│           └── ranking-table.hbs      # Tabela de ranking
│
├── public/                            # Assets estáticos
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js                     # Animação do ranking
│
├── test/                              # Testes
│   ├── unit/
│   │   └── use-cases/
│   └── e2e/
│
├── uploads/                           # Arquivos de log uploadados
├── database.sqlite                    # Banco SQLite
└── README.md
```

---

## Features por Etapa

### Etapa 1: Setup Inicial
- [ ] Inicializar projeto NestJS
- [ ] Configurar TypeScript strict
- [ ] Configurar ESLint/Prettier
- [ ] Inicializar Git + primeiro commit

### Etapa 2: Core Domain (Entities)
- [ ] `Match` - id, startTime, endTime, players, kills
- [ ] `Player` - name, frags, deaths, team?
- [ ] `KillEvent` - timestamp, killer, victim, weapon
- [ ] `Team` - name, players (bônus)

### Etapa 3: Parser de Logs
- [ ] Regex para cada tipo de linha:
  - `New match X has started`
  - `Player killed Player using Weapon`
  - `<WORLD> killed Player by Cause`
  - `Match X has ended`
- [ ] Retornar eventos estruturados

### Etapa 4: Use Cases (um por um)
- [ ] `ParseLogUseCase` - orquestra o parsing
- [ ] `CalculateRankingUseCase` - ordena por frags
- [ ] `CalculateStreakUseCase` - maior sequência sem morrer
- [ ] `CalculateAwardsUseCase` - verifica condições de awards
- [ ] `GetFavoriteWeaponUseCase` - arma mais usada pelo vencedor
- [ ] `CalculateGlobalRankingUseCase` - soma de todas partidas
- [ ] `ProcessFriendlyFireUseCase` - -1 frag se mesmo time

### Etapa 5: Infraestrutura
- [ ] SQLite + TypeORM ou Prisma
- [ ] Repositórios implementados
- [ ] Upload de arquivos (Multer)

### Etapa 6: API REST
- [ ] `POST /upload` - upload do arquivo de log
- [ ] `GET /matches` - lista todas partidas
- [ ] `GET /matches/:id` - detalhes de uma partida
- [ ] `GET /ranking/global` - ranking global
- [ ] `GET /players/:name` - stats de um jogador

### Etapa 7: WebSocket + Animação
- [ ] Gateway WebSocket no NestJS
- [ ] Emitir evento a cada kill parseada
- [ ] Frontend recebe e atualiza ranking com animação CSS
- [ ] Delay entre eventos para efeito visual

### Etapa 8: Frontend
- [ ] Layout com sidebar esquerda
- [ ] Sidebar: lista de entradas salvas (clicável)
- [ ] Área principal: upload + ranking animado
- [ ] Animação: linhas do ranking subindo/descendo com transition CSS
- [ ] Resultado final destacado

### Etapa 9: Testes
- [ ] Testes unitários dos use cases
- [ ] Testes do parser
- [ ] Teste e2e básico

### Etapa 10: Deploy
- [ ] Configurar Railway
- [ ] Variáveis de ambiente
- [ ] Deploy + README

---

## Fluxo da Animação

```
1. Usuário faz upload do arquivo
2. Backend parseia linha por linha
3. Para cada kill:
   - Emite evento WebSocket com ranking atualizado
   - Frontend recebe e anima a tabela
   - Delay de 500ms entre eventos
4. Ao finalizar partida:
   - Mostra resultado final com destaque
   - Salva na sidebar
5. Usuário pode clicar na sidebar para ver partidas anteriores
```

---

## Modelo de Dados (SQLite)

```sql
-- Partidas
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  started_at DATETIME,
  ended_at DATETIME,
  winner_name TEXT,
  winner_weapon TEXT
);

-- Jogadores por partida
CREATE TABLE match_players (
  id INTEGER PRIMARY KEY,
  match_id TEXT,
  player_name TEXT,
  team TEXT,
  frags INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  max_streak INTEGER DEFAULT 0,
  has_flawless_award BOOLEAN DEFAULT FALSE,
  has_frenzy_award BOOLEAN DEFAULT FALSE
);

-- Eventos de kill (para replay/animação)
CREATE TABLE kill_events (
  id INTEGER PRIMARY KEY,
  match_id TEXT,
  timestamp DATETIME,
  killer_name TEXT,
  victim_name TEXT,
  weapon TEXT,
  is_world_kill BOOLEAN DEFAULT FALSE
);

-- Ranking global (cache)
CREATE TABLE global_ranking (
  player_name TEXT PRIMARY KEY,
  total_frags INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0
);
```

---

## Commits Planejados

1. `chore: initialize nestjs project with typescript`
2. `feat: add core entities (Match, Player, KillEvent)`
3. `feat: implement log parser with regex`
4. `feat: add ParseLogUseCase`
5. `feat: add CalculateRankingUseCase`
6. `feat: add streak and awards use cases`
7. `feat: add global ranking and favorite weapon use cases`
8. `feat: add friendly fire use case`
9. `feat: setup sqlite with typeorm`
10. `feat: implement repositories`
11. `feat: add upload and match controllers`
12. `feat: add websocket gateway for real-time updates`
13. `feat: add frontend views with handlebars`
14. `feat: implement ranking animation with css transitions`
15. `feat: add sidebar with match history`
16. `test: add unit tests for use cases`
17. `test: add e2e tests`
18. `docs: add README with setup instructions`
19. `chore: configure for railway deployment`

---

## Verificação Final

Para testar que tudo funciona:

1. **Rodar localmente:**
   ```bash
   npm run start:dev
   ```

2. **Acessar:** `http://localhost:3000`

3. **Testar upload:** Usar o arquivo de log do desafio

4. **Verificar:**
   - [ ] Animação do ranking funciona
   - [ ] Sidebar salva entradas
   - [ ] Todos os bônus aparecem (streak, awards, etc)
   - [ ] Ranking global funciona
   - [ ] Clique na sidebar mostra partida anterior

5. **Rodar testes:**
   ```bash
   npm run test
   npm run test:e2e
   ```

---

## Decisões Tomadas

1. ~~Framework confirmado~~ → NestJS ✅
2. ~~Deploy~~ → Railway ✅
3. ~~Animação~~ → WebSocket + CSS transitions ✅
4. ~~Sistema de times~~ → **Deixar para ÚLTIMO**
5. ~~Ranking global~~ → **Decidir depois** (só do arquivo ou todas partidas)

## Layout

- Ranking principal em cima
- **Highlights** embaixo com os bônus:
  - 🔫 Arma favorita do vencedor
  - 🔥 Maior streak
  - 🏅 Award Flawless (venceu sem morrer)
  - ⚡ Award Frenzy (5 kills em 1 min)
