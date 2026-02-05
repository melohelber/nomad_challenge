import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ParseLogUseCase } from '../../core/use-cases/parse-log.use-case';
import { CalculateRankingUseCase } from '../../core/use-cases/calculate-ranking.use-case';
import { GetHighlightsUseCase } from '../../core/use-cases/get-highlights.use-case';
import { MatchRepository } from '../../infra/database/repositories/match.repository';
import { Match } from '../../core/entities';

interface RankingSnapshot {
  matchId: string;
  eventNumber: number;
  totalEvents: number;
  ranking: {
    position: number;
    name: string;
    frags: number;
    deaths: number;
    kd: number;
  }[];
  lastEvent: {
    type: 'kill' | 'match_start' | 'match_end';
    killer?: string;
    victim?: string;
    weapon?: string;
    isWorldKill?: boolean;
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RankingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track skip requests per client
  private skipRequests: Map<string, boolean> = new Map();

  constructor(
    private readonly parseLogUseCase: ParseLogUseCase,
    private readonly calculateRankingUseCase: CalculateRankingUseCase,
    private readonly getHighlightsUseCase: GetHighlightsUseCase,
    private readonly matchRepository: MatchRepository,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    this.skipRequests.set(client.id, false);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.skipRequests.delete(client.id);
  }

  @SubscribeMessage('skipToResults')
  handleSkipToResults(client: Socket) {
    console.log(`Skip requested by: ${client.id}`);
    this.skipRequests.set(client.id, true);
  }

  @SubscribeMessage('processLog')
  async handleProcessLog(client: Socket, payload: { content: string; delay?: number }) {
    const { content, delay = 500 } = payload;
    const { events } = this.parseLogUseCase.execute(content);

    // Reset skip flag at start
    this.skipRequests.set(client.id, false);

    let currentMatch: Match | null = null;
    let eventNumber = 0;

    for (const event of events) {
      eventNumber++;

      // Check if skip was requested
      const shouldSkip = this.skipRequests.get(client.id);

      switch (event.type) {
        case 'match_start':
          currentMatch = new Match(event.matchId, event.timestamp);
          if (!shouldSkip) {
            client.emit('rankingUpdate', {
              matchId: event.matchId,
              eventNumber,
              totalEvents: events.length,
              ranking: [],
              lastEvent: { type: 'match_start' },
            } as RankingSnapshot);
          }
          break;

        case 'kill':
          if (currentMatch) {
            currentMatch.addKillEvent(event.event);

            if (!shouldSkip) {
              const ranking = this.buildRankingSnapshot(currentMatch);
              client.emit('rankingUpdate', {
                matchId: currentMatch.id,
                eventNumber,
                totalEvents: events.length,
                ranking,
                lastEvent: {
                  type: 'kill',
                  killer: event.event.killerName,
                  victim: event.event.victimName,
                  weapon: event.event.weapon,
                  isWorldKill: event.event.isWorldKill,
                },
              } as RankingSnapshot);
            }
          }
          break;

        case 'match_end':
          if (currentMatch && currentMatch.id === event.matchId) {
            currentMatch.endMatch(event.timestamp);

            const finalRanking = this.calculateRankingUseCase.execute(currentMatch);
            const highlights = this.getHighlightsUseCase.execute(currentMatch);

            await this.matchRepository.save(currentMatch);

            client.emit('matchComplete', {
              matchId: currentMatch.id,
              ranking: finalRanking,
              highlights: highlights.highlights,
            });

            currentMatch = null;
          }
          break;
      }

      // Only delay if not skipping
      if (!shouldSkip) {
        await this.sleep(delay);
      }
    }

    // Reset skip flag
    this.skipRequests.set(client.id, false);

    client.emit('processingComplete', { totalMatches: events.filter(e => e.type === 'match_end').length });
  }

  private buildRankingSnapshot(match: Match): RankingSnapshot['ranking'] {
    return match.getRanking().map((player, index) => ({
      position: index + 1,
      name: player.name,
      frags: player.frags,
      deaths: player.deaths,
      kd: player.getKD(),
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
