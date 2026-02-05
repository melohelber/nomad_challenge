import { Injectable } from '@nestjs/common';
import { Match, Player } from '../entities';

export interface RankingEntry {
  position: number;
  name: string;
  frags: number;
  deaths: number;
  kd: number;
  isWinner: boolean;
}

export interface MatchRanking {
  matchId: string;
  startedAt: Date;
  endedAt: Date | null;
  ranking: RankingEntry[];
}

@Injectable()
export class CalculateRankingUseCase {
  execute(match: Match): MatchRanking {
    const sortedPlayers = match.getRanking();
    const winner = sortedPlayers[0] || null;

    const ranking: RankingEntry[] = sortedPlayers.map((player, index) => ({
      position: index + 1,
      name: player.name,
      frags: player.frags,
      deaths: player.deaths,
      kd: player.getKD(),
      isWinner: player === winner,
    }));

    return {
      matchId: match.id,
      startedAt: match.startedAt,
      endedAt: match.endedAt,
      ranking,
    };
  }

  executeForMultiple(matches: Match[]): MatchRanking[] {
    return matches.map((match) => this.execute(match));
  }
}
