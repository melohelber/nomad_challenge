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
- Sidebar com histórico de partidas

### Animação em Tempo Real
O sistema usa WebSocket para atualizar o ranking em tempo real conforme os eventos são processados, criando uma animação visual que mostra as posições subindo e descendo.

## Arquitetura

O projeto segue os princípios de Clean Architecture e SOLID:

```
src/
├── core/                    # Domínio
│   ├── entities/            # Entidades do domínio
│   └── use-cases/           # Casos de uso
├── infra/                   # Infraestrutura
│   ├── database/            # TypeORM + SQLite
│   └── parsers/             # Parser de logs
└── modules/                 # Módulos NestJS
    ├── match/               # Controller e Service
    └── websocket/           # Gateway WebSocket
```

## Stack Tecnológica

| Camada | Tecnologia |
|--------|------------|
| Backend | NestJS + TypeScript |
| Banco de Dados | SQLite (better-sqlite3) |
| Real-time | WebSocket (Socket.io) |
| Frontend | Handlebars + Vanilla JS + CSS |

## Como Executar

### Pré-requisitos
- Node.js 18+ (recomendado: 20 LTS)
- npm

### Instalação

```bash
# Clonar o repositório
git clone <url-do-repositorio>
cd nomad

# Instalar dependências
npm install
```

### Executar em desenvolvimento

```bash
npm run start:dev
```

Acesse: http://localhost:3000

### Build para produção

```bash
npm run build
npm run start:prod
```

## Como Usar

1. Acesse http://localhost:3000
2. Selecione um arquivo de log (formato .txt ou .log)
3. Ajuste a velocidade da animação (100ms - 1000ms)
4. Clique em "Processar"
5. Observe a animação do ranking em tempo real
6. Veja os highlights ao final de cada partida
7. Use a sidebar para navegar entre partidas anteriores

## Formato do Log

```
23/04/2019 15:34:22 - New match 11348965 has started
23/04/2019 15:36:04 - Roman killed Nick using M16
23/04/2019 15:36:33 - <WORLD> killed Nick by DROWN
23/04/2019 15:39:22 - Match 11348965 has ended
```

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Página principal |
| POST | `/api/upload` | Upload de arquivo de log |
| GET | `/api/matches` | Lista todas as partidas |
| GET | `/api/matches/:id` | Detalhes de uma partida |
| GET | `/api/ranking/global` | Ranking global |

## WebSocket Events

### Cliente -> Servidor
- `processLog`: Envia conteúdo do log para processamento com animação

### Servidor -> Cliente
- `rankingUpdate`: Atualização do ranking a cada kill
- `matchComplete`: Partida finalizada com highlights
- `processingComplete`: Processamento concluído

## Deploy no Railway

1. Crie uma conta no [Railway](https://railway.app)
2. Conecte seu repositório GitHub
3. O Railway detectará automaticamente o NestJS
4. Configure as variáveis de ambiente:
   ```
   PORT=3000
   NODE_ENV=production
   ```
5. Deploy!

## Decisões de Design

1. **Clean Architecture**: Separação clara entre domínio, infraestrutura e aplicação
2. **Use Cases**: Cada operação é um caso de uso independente
3. **Entities imutáveis**: KillEvent é imutável, Match e Player encapsulam lógica
4. **WebSocket para animação**: Permite feedback visual em tempo real
5. **SQLite**: Banco simples, sem necessidade de setup externo

## Features Pendentes

1. Sistema de times com friendly fire
2. Decidir escopo do ranking global (só do arquivo vs todas as partidas)

## Licença

MIT
