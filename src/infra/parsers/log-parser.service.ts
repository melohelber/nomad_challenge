import { Injectable } from '@nestjs/common';
import { Match, KillEvent } from '../../core/entities';

export type LogEvent =
  | { type: 'match_start'; matchId: string; timestamp: Date }
  | { type: 'match_end'; matchId: string; timestamp: Date }
  | { type: 'kill'; event: KillEvent };

@Injectable()
export class LogParserService {
  private readonly MATCH_START_REGEX =
    /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}) - New match (\d+) has started$/;

  private readonly MATCH_END_REGEX =
    /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}) - Match (\d+) has ended$/;

  private readonly PLAYER_KILL_REGEX =
    /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}) - (.+) killed (.+) using (.+)$/;

  private readonly WORLD_KILL_REGEX =
    /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}) - <WORLD> killed (.+) by (.+)$/;

  parseLog(content: string): Match[] {
    const lines = content.split('\n').filter((line) => line.trim());
    const matches: Match[] = [];
    let currentMatch: Match | null = null;

    for (const line of lines) {
      const event = this.parseLine(line);
      if (!event) continue;

      switch (event.type) {
        case 'match_start':
          currentMatch = new Match(event.matchId, event.timestamp);
          break;

        case 'match_end':
          if (currentMatch && currentMatch.id === event.matchId) {
            currentMatch.endMatch(event.timestamp);
            matches.push(currentMatch);
            currentMatch = null;
          }
          break;

        case 'kill':
          if (currentMatch) {
            currentMatch.addKillEvent(event.event);
          }
          break;
      }
    }

    return matches;
  }

  parseLogWithEvents(content: string): { matches: Match[]; events: LogEvent[] } {
    const lines = content.split('\n').filter((line) => line.trim());
    const matches: Match[] = [];
    const events: LogEvent[] = [];
    let currentMatch: Match | null = null;

    for (const line of lines) {
      const event = this.parseLine(line);
      if (!event) continue;

      events.push(event);

      switch (event.type) {
        case 'match_start':
          currentMatch = new Match(event.matchId, event.timestamp);
          break;

        case 'match_end':
          if (currentMatch && currentMatch.id === event.matchId) {
            currentMatch.endMatch(event.timestamp);
            matches.push(currentMatch);
            currentMatch = null;
          }
          break;

        case 'kill':
          if (currentMatch) {
            currentMatch.addKillEvent(event.event);
          }
          break;
      }
    }

    return { matches, events };
  }

  private parseLine(line: string): LogEvent | null {
    const trimmedLine = line.trim();

    const matchStart = trimmedLine.match(this.MATCH_START_REGEX);
    if (matchStart) {
      return {
        type: 'match_start',
        matchId: matchStart[2],
        timestamp: this.parseTimestamp(matchStart[1]),
      };
    }

    const matchEnd = trimmedLine.match(this.MATCH_END_REGEX);
    if (matchEnd) {
      return {
        type: 'match_end',
        matchId: matchEnd[2],
        timestamp: this.parseTimestamp(matchEnd[1]),
      };
    }

    const worldKill = trimmedLine.match(this.WORLD_KILL_REGEX);
    if (worldKill) {
      return {
        type: 'kill',
        event: KillEvent.createWorldKill(
          this.parseTimestamp(worldKill[1]),
          worldKill[2],
          worldKill[3],
        ),
      };
    }

    const playerKill = trimmedLine.match(this.PLAYER_KILL_REGEX);
    if (playerKill) {
      return {
        type: 'kill',
        event: KillEvent.createPlayerKill(
          this.parseTimestamp(playerKill[1]),
          playerKill[2],
          playerKill[3],
          playerKill[4],
        ),
      };
    }

    return null;
  }

  private parseTimestamp(dateStr: string): Date {
    const [datePart, timePart] = dateStr.split(' ');
    const [day, month, year] = datePart.split('/').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, seconds);
  }
}
