import { Injectable } from '@nestjs/common';
import { Match, MatchHighlights } from '../entities';

export interface Highlight {
  type: 'favorite_weapon' | 'best_streak' | 'flawless' | 'frenzy';
  icon: string;
  title: string;
  description: string;
}

export interface MatchHighlightsResult {
  matchId: string;
  highlights: Highlight[];
}

@Injectable()
export class GetHighlightsUseCase {
  execute(match: Match): MatchHighlightsResult {
    const matchHighlights = match.getHighlights();
    const highlights = this.buildHighlights(matchHighlights);

    return {
      matchId: match.id,
      highlights,
    };
  }

  private buildHighlights(data: MatchHighlights): Highlight[] {
    const highlights: Highlight[] = [];

    if (data.winnerFavoriteWeapon) {
      highlights.push({
        type: 'favorite_weapon',
        icon: '🔫',
        title: "Winner's Favorite Weapon",
        description: `${data.winnerFavoriteWeapon.weapon} (${data.winnerFavoriteWeapon.kills} kills)`,
      });
    }

    if (data.bestStreak && data.bestStreak.streak > 1) {
      highlights.push({
        type: 'best_streak',
        icon: '🔥',
        title: 'Best Streak',
        description: `${data.bestStreak.player.name} - ${data.bestStreak.streak} kills without dying`,
      });
    }

    for (const player of data.flawlessPlayers) {
      highlights.push({
        type: 'flawless',
        icon: '🏅',
        title: 'FLAWLESS Award',
        description: `${player.name} (won without dying)`,
      });
    }

    for (const player of data.frenzyPlayers) {
      highlights.push({
        type: 'frenzy',
        icon: '⚡',
        title: 'FRENZY Award',
        description: `${player.name} (5 kills in 1 minute)`,
      });
    }

    return highlights;
  }
}
