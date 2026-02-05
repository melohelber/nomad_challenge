import { Injectable } from '@nestjs/common';
import { Match } from '../entities';
import { Team } from '../entities/kill-event.entity';

export interface RankingEntry {
  position: number;
  name: string;
  frags: number;
  deaths: number;
  kd: number;
  isWinner: boolean;
  team?: Team;
  friendlyKills?: number;
  score?: number;
}

export interface MatchRanking {
  matchId: string;
  startedAt: Date;
  endedAt: Date | null;
  hasTeams: boolean;
  ranking: RankingEntry[];
}

@Injectable()
export class CalculateRankingUseCase {
  execute(match: Match): MatchRanking {
    const sortedPlayers = match.getRanking();
    const winner = sortedPlayers[0] || null;

    const ranking: RankingEntry[] = sortedPlayers.map((player, index) => {
      const entry: RankingEntry = {
        position: index + 1,
        name: player.name,
        frags: player.frags,
        deaths: player.deaths,
        kd: player.getKD(),
        isWinner: player === winner,
      };

      if (match.hasTeams) {
        entry.team = player.team;
        entry.friendlyKills = player.friendlyKills;
        entry.score = player.getScore();
      }

      return entry;
    });

    return {
      matchId: match.id,
      startedAt: match.startedAt,
      endedAt: match.endedAt,
      hasTeams: match.hasTeams,
      ranking,
    };
  }

  executeForMultiple(matches: Match[]): MatchRanking[] {
    return matches.map((match) => this.execute(match));
  }
}
