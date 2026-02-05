import { Injectable } from '@nestjs/common';
import { Match, KillEvent } from '../../core/entities';

export type LogEvent =
  | { type: 'match_start'; matchId: string; timestamp: Date; hasTeams: boolean }
  | { type: 'match_end'; matchId: string; timestamp: Date; hasTeams: boolean }
  | { type: 'kill'; event: KillEvent };

@Injectable()
export class LogParserService {
  private readonly MATCH_START_REGEX =
    /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}) - New match (\d+) has started$/;

  private readonly MATCH_START_TEAMS_REGEX =
    /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}) - New match (\d+) has started with teams$/;

  private readonly MATCH_END_REGEX =
    /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}) - Match (\d+) has ended$/;

  private readonly MATCH_END_TEAMS_REGEX =
    /^(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}) - Match (\d+) has ended with teams$/;

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
          currentMatch = new Match(event.matchId, event.timestamp, event.hasTeams);
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

  parseLogWithEvents(content: string): { matches: Match[]; events: LogEvent[]; invalidLines: { line: string; error: string }[] } {
    const lines = content.split('\n').filter((line) => line.trim());
    const matches: Match[] = [];
    const events: LogEvent[] = [];
    const invalidLines: { line: string; error: string }[] = [];
    let currentMatch: Match | null = null;

    for (const line of lines) {
      const event = this.parseLine(line);
      if (!event) {
        if (this.looksLikeLogLine(line)) {
          const error = this.getFormatError(line) || 'Invalid format';
          invalidLines.push({ line: line.trim(), error });
        }
        continue;
      }

      events.push(event);

      switch (event.type) {
        case 'match_start':
          currentMatch = new Match(event.matchId, event.timestamp, event.hasTeams);
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

    return { matches, events, invalidLines };
  }

  private looksLikeLogLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed) return false;

    const hasDatePattern = /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(trimmed);
    const hasTimePattern = /\d{1,2}:\d{1,2}/.test(trimmed);
    const hasKeywords = /match|killed|started|ended|world/i.test(trimmed);
    const hasDash = trimmed.includes(' - ');

    return hasDatePattern || hasTimePattern || hasKeywords || hasDash;
  }

  getFormatError(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const fullFormatRegex = /^(\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2}:\d{2}) - (.+)$/;
    const match = trimmed.match(fullFormatRegex);

    if (!match) {
      if (!/^\d{2}\/\d{2}\/\d{4}/.test(trimmed)) {
        return 'Invalid date format. Expected: DD/MM/YYYY';
      }
      if (!/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/.test(trimmed)) {
        return 'Invalid time format. Expected: HH:MM:SS';
      }
      if (!trimmed.includes(' - ')) {
        return 'Missing separator " - " after timestamp';
      }
      return 'Invalid line format';
    }

    const eventPart = match[3];

    const isMatchStart = /^New match \d+ has started( with teams)?$/.test(eventPart);
    const isMatchEnd = /^Match \d+ has ended( with teams)?$/.test(eventPart);
    const isPlayerKill = /^.+ killed .+ using .+$/.test(eventPart);
    const isWorldKill = /^<WORLD> killed .+ by .+$/.test(eventPart);

    if (!isMatchStart && !isMatchEnd && !isPlayerKill && !isWorldKill) {
      if (/start/i.test(eventPart)) {
        return 'Invalid match start. Expected: "New match [ID] has started" or "New match [ID] has started with teams"';
      }
      if (/end/i.test(eventPart)) {
        return 'Invalid match end. Expected: "Match [ID] has ended" or "Match [ID] has ended with teams"';
      }
      if (/kill/i.test(eventPart)) {
        return 'Invalid kill event. Expected: "[Player] killed [Player] using [Weapon]" or "<WORLD> killed [Player] by [Cause]"';
      }
      return 'Unrecognized event type';
    }

    return null;
  }

  private parseLine(line: string): LogEvent | null {
    const trimmedLine = line.trim();

    // Check teams format first (more specific)
    const matchStartTeams = trimmedLine.match(this.MATCH_START_TEAMS_REGEX);
    if (matchStartTeams) {
      return {
        type: 'match_start',
        matchId: matchStartTeams[2],
        timestamp: this.parseTimestamp(matchStartTeams[1]),
        hasTeams: true,
      };
    }

    const matchStart = trimmedLine.match(this.MATCH_START_REGEX);
    if (matchStart) {
      return {
        type: 'match_start',
        matchId: matchStart[2],
        timestamp: this.parseTimestamp(matchStart[1]),
        hasTeams: false,
      };
    }

    const matchEndTeams = trimmedLine.match(this.MATCH_END_TEAMS_REGEX);
    if (matchEndTeams) {
      return {
        type: 'match_end',
        matchId: matchEndTeams[2],
        timestamp: this.parseTimestamp(matchEndTeams[1]),
        hasTeams: true,
      };
    }

    const matchEnd = trimmedLine.match(this.MATCH_END_REGEX);
    if (matchEnd) {
      return {
        type: 'match_end',
        matchId: matchEnd[2],
        timestamp: this.parseTimestamp(matchEnd[1]),
        hasTeams: false,
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
