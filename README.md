# FPS Match Log Parser

Sistema para processar logs de partidas de jogos FPS, calcular rankings e exibir estatísticas com animação em tempo real.

## Features

### Requisitos Implementados
- Parser de logs de partidas FPS
- Ranking por partida (frags e mortes)
- Suporte a múltiplas partidas em um único arquivo
- Mortes por `<WORLD>` não contam como frags

### Bônus Implementados
- Arma favorita do vencedor
- Maior streak (kills sem morrer)
- Award FLAWLESS (venceu sem morrer)
- Award FRENZY (5 kills em 1 minuto)
- Ranking global (todas as partidas)
- **Modo Times (TR vs CT) com Friendly Fire**

### Animação em Tempo Real
O sistema usa WebSocket para atualizar o ranking em tempo real conforme os eventos são processados, criando uma animação visual que mostra as posições subindo e descendo.

> **Nota:** O banco de dados é armazenado em memória. Ao recarregar a página ou reiniciar o servidor, todos os dados são apagados e o sistema começa do zero.

---

## Modo Times (Team Mode)

O sistema suporta partidas com dois times: **TR** (Terroristas) e **CT** (Contra-Terroristas).

### Formato do Log com Times

```
DD/MM/YYYY HH:MM:SS - New match [ID] has started with teams
DD/MM/YYYY HH:MM:SS - [TR]Player killed [CT]Player using Weapon
DD/MM/YYYY HH:MM:SS - Match [ID] has ended with teams
```

**Exemplo:**
```
23/04/2019 15:34:22 - New match 11348965 has started with teams
23/04/2019 15:36:04 - [TR]Roman killed [CT]Nick using M16
23/04/2019 15:36:33 - [TR]Roman killed [TR]Alpha using M16
23/04/2019 15:39:22 - Match 11348965 has ended with teams
```

### Prefixos de Time
- `[TR]` - Terroristas
- `[CT]` - Contra-Terroristas

**Importante:** Em partidas `with teams`, todos os jogadores **devem** ter um prefixo de time. O sistema valida isso e retorna erro se algum jogador não tiver o prefixo.

### Sistema de Pontuação

No modo times, o ranking é baseado em **Score**, não apenas em kills:

| Evento | Pontos |
|--------|--------|
| Kill em inimigo | +1 |
| Friendly Fire (matar teammate) | -1 |

**Fórmula:** `Score = Frags - Friendly Kills`

### Colunas no Modo Times

| Coluna | Descrição |
|--------|-----------|
| Team | TR ou CT |
| Score | Pontuação líquida (Frags - FF) |
| Kills | Kills em inimigos |
| FF | Friendly Fire (kills em teammates) |
| Deaths | Total de mortes |
| K/D | Kills / Deaths |

### Friendly Fire

Quando um jogador mata alguém do **mesmo time**, isso conta como Friendly Fire:

```
[TR]Roman killed [TR]Alpha using M16  → FF! Roman perde 1 ponto
[CT]Nick killed [TR]Mike using AK47   → OK! Nick ganha 1 ponto
```

---

## Como Executar

### Pré-requisitos
- Node.js 18+
- npm

### Instalação

```bash
npm install
```

### Desenvolvimento

```bash
npm run start:dev
```

Acesse: http://localhost:3000

### Produção

```bash
npm run build
npm run start:prod
```

---

## Como Usar

1. Acesse http://localhost:3000
2. Cole o log na área de texto
3. Ajuste a velocidade da animação (50ms - 1000ms)
4. Clique em "Process"
5. Observe a animação do ranking em tempo real
6. Veja os highlights ao final de cada partida

> **Dica:** Clique em "Log Format Help" abaixo da área de texto para ver exemplos do formato aceito.

---

## Formato do Log

### Modo Padrão (Sem Times)

```
23/04/2019 15:34:22 - New match 11348965 has started
23/04/2019 15:36:04 - Roman killed Nick using M16
23/04/2019 15:36:33 - <WORLD> killed Nick by DROWN
23/04/2019 15:39:22 - Match 11348965 has ended
```

### Modo Times

```
23/04/2019 15:34:22 - New match 11348965 has started with teams
23/04/2019 15:36:04 - [TR]Roman killed [CT]Nick using M16
23/04/2019 15:36:33 - [TR]Roman killed [TR]Alpha using M16
23/04/2019 15:37:10 - <WORLD> killed [CT]Mike by DROWN
23/04/2019 15:39:22 - Match 11348965 has ended with teams
```

---

## Validações

O sistema valida:

1. **Formato** - Todas as linhas devem seguir o padrão esperado
2. **Integridade** - Toda partida iniciada deve ter um fim correspondente
3. **Times** - Em partidas `with teams`, todos os jogadores devem ter prefixo `[TR]` ou `[CT]`

---

## Highlights

| Award | Critério |
|-------|----------|
| Winner | Maior frags/score |
| Favorite Weapon | Arma mais usada pelo vencedor |
| Best Streak | Maior sequência de kills sem morrer |
| Flawless Victory | Vencedor com 0 mortes |
| Frenzy Award | 5+ kills em 1 minuto |

---

## Arquitetura

O projeto segue Clean Architecture:

```
src/
├── core/
│   ├── entities/         # Entidades de domínio
│   └── use-cases/        # Casos de uso
├── infra/
│   ├── database/         # Repositório em memória
│   └── parsers/          # Parser de logs
└── modules/
    └── websocket/        # Gateway WebSocket
```

## Stack

| Camada | Tecnologia |
|--------|------------|
| Backend | NestJS + TypeScript |
| Real-time | Socket.io |
| Frontend | Vanilla JS + CSS |
| Template | Handlebars |

---

## WebSocket Events

### Cliente → Servidor
- `processLog` - Processa o log `{ content: string, delay?: number }`
- `skipToResults` - Pula animação

### Servidor → Cliente
- `rankingUpdate` - Atualização do ranking
- `matchComplete` - Partida finalizada
- `processingComplete` - Processamento concluído
- `processingError` - Erro de validação

---

## Licença

MIT
