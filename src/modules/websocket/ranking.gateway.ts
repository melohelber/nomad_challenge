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
import { LogEvent } from '../../infra/parsers';
import { Team } from '../../core/entities/kill-event.entity';

interface RankingSnapshot {
  matchId: string;
  eventNumber: number;
  totalEvents: number;
  hasTeams: boolean;
  ranking: {
    position: number;
    name: string;
    frags: number;
    deaths: number;
    kd: number;
    team?: Team;
    friendlyKills?: number;
    score?: number;
  }[];
  lastEvent: {
    type: 'kill' | 'match_start' | 'match_end';
    killer?: string;
    victim?: string;
    weapon?: string;
    isWorldKill?: boolean;
    isFriendlyFire?: boolean;
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
    const { events, invalidLines } = this.parseLogUseCase.execute(content);

    const validationResult = this.validateLogEvents(events, invalidLines);

    if (!validationResult.isValid) {
      client.emit('processingError', {
        message: validationResult.error,
      });
      return;
    }

    // Validation passed - tell client to show processing UI
    client.emit('validationPassed', { totalEvents: events.length });

    this.skipRequests.set(client.id, false);

    let currentMatch: Match | null = null;
    let eventNumber = 0;

    for (const event of events) {
      eventNumber++;
      const shouldSkip = this.skipRequests.get(client.id);

      switch (event.type) {
        case 'match_start':
          currentMatch = new Match(event.matchId, event.timestamp, event.hasTeams);
          if (!shouldSkip) {
            client.emit('rankingUpdate', {
              matchId: event.matchId,
              eventNumber,
              totalEvents: events.length,
              hasTeams: event.hasTeams,
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
                hasTeams: currentMatch.hasTeams,
                ranking,
                lastEvent: {
                  type: 'kill',
                  killer: event.event.killerName,
                  victim: event.event.victimName,
                  weapon: event.event.weapon,
                  isWorldKill: event.event.isWorldKill,
                  isFriendlyFire: event.event.isFriendlyFire,
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
              hasTeams: currentMatch.hasTeams,
              ranking: finalRanking,
              highlights: highlights.highlights,
            });

            currentMatch = null;
          }
          break;
      }

      if (!shouldSkip) {
        await this.sleep(delay);
      }
    }

    this.skipRequests.set(client.id, false);

    client.emit('processingComplete', { totalMatches: events.filter(e => e.type === 'match_end').length });
  }

  private buildRankingSnapshot(match: Match): RankingSnapshot['ranking'] {
    return match.getRanking().map((player, index) => {
      const entry: RankingSnapshot['ranking'][0] = {
        position: index + 1,
        name: player.name,
        frags: player.frags,
        deaths: player.deaths,
        kd: player.getKD(),
      };

      if (match.hasTeams) {
        entry.team = player.team;
        entry.friendlyKills = player.friendlyKills;
        entry.score = player.getScore();
      }

      return entry;
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private validateLogEvents(
    events: LogEvent[],
    invalidLines: { line: string; error: string }[]
  ): { isValid: boolean; error?: string } {
    if (invalidLines.length > 0) {
      const errorDetails = invalidLines
        .slice(0, 3)
        .map(({ line, error }) => `• ${error}\n  "${line.substring(0, 60)}${line.length > 60 ? '...' : ''}"`)
        .join('\n\n');

      return {
        isValid: false,
        error: `Format errors found:\n\n${errorDetails}`,
      };
    }

    if (events.length === 0) {
      return {
        isValid: false,
        error: 'No valid log entries found.\n\nExpected format:\nDD/MM/YYYY HH:MM:SS - New match [ID] has started\nDD/MM/YYYY HH:MM:SS - [Player] killed [Player] using [Weapon]\nDD/MM/YYYY HH:MM:SS - Match [ID] has ended'
      };
    }

    const startedMatches = new Map<string, boolean>();
    const endedMatches = new Set<string>();

    for (const event of events) {
      if (event.type === 'match_start') {
        startedMatches.set(event.matchId, event.hasTeams);
      } else if (event.type === 'match_end') {
        endedMatches.add(event.matchId);
      }
    }

    if (startedMatches.size === 0) {
      return { isValid: false, error: 'No matches found.\n\nMake sure your log contains:\n"DD/MM/YYYY HH:MM:SS - New match [ID] has started"' };
    }

    const incompleteMatches: string[] = [];
    for (const matchId of startedMatches.keys()) {
      if (!endedMatches.has(matchId)) {
        incompleteMatches.push(matchId);
      }
    }

    if (incompleteMatches.length > 0) {
      const matchList = incompleteMatches.join(', ');
      return {
        isValid: false,
        error: `Incomplete matches: ${matchList}\n\nEach match needs both:\n• "New match [ID] has started"\n• "Match [ID] has ended"`
      };
    }

    // Check for orphan match ends (ended without being started)
    const orphanEnds: string[] = [];
    for (const matchId of endedMatches) {
      if (!startedMatches.has(matchId)) {
        orphanEnds.push(matchId);
      }
    }

    if (orphanEnds.length > 0) {
      const matchList = orphanEnds.join(', ');
      return {
        isValid: false,
        error: `Match end without start: ${matchList}\n\nEach match needs both:\n• "New match [ID] has started"\n• "Match [ID] has ended"`
      };
    }

    // Validate team names for matches with teams
    const teamValidation = this.validateTeamNames(events, startedMatches);
    if (!teamValidation.isValid) {
      return teamValidation;
    }

    return { isValid: true };
  }

  private validateTeamNames(
    events: LogEvent[],
    matchesWithTeams: Map<string, boolean>
  ): { isValid: boolean; error?: string } {
    let currentMatchId: string | null = null;
    let currentMatchHasTeams = false;
    const playersWithoutTeam: string[] = [];

    for (const event of events) {
      if (event.type === 'match_start') {
        currentMatchId = event.matchId;
        currentMatchHasTeams = event.hasTeams;
      } else if (event.type === 'match_end') {
        currentMatchId = null;
        currentMatchHasTeams = false;
      } else if (event.type === 'kill' && currentMatchHasTeams) {
        const killEvent = event.event;

        // Check killer team (unless world kill)
        if (!killEvent.isWorldKill && !killEvent.killerTeam) {
          if (!playersWithoutTeam.includes(killEvent.killerName)) {
            playersWithoutTeam.push(killEvent.killerName);
          }
        }

        // Check victim team
        if (!killEvent.victimTeam) {
          if (!playersWithoutTeam.includes(killEvent.victimName)) {
            playersWithoutTeam.push(killEvent.victimName);
          }
        }
      }
    }

    if (playersWithoutTeam.length > 0) {
      const playerList = playersWithoutTeam.slice(0, 5).join(', ');
      const more = playersWithoutTeam.length > 5 ? ` and ${playersWithoutTeam.length - 5} more` : '';
      return {
        isValid: false,
        error: `Team mode validation error:\n\nPlayers without team prefix: ${playerList}${more}\n\nIn "with teams" matches, all player names must have [TR] or [CT] prefix.\nExample: [TR]PlayerName or [CT]PlayerName`
      };
    }

    return { isValid: true };
  }
}
