import { KillEvent } from './kill-event.entity';
import { Player } from './player.entity';

export class Match {
  public players: Map<string, Player> = new Map();
  public killEvents: KillEvent[] = [];
  public endedAt: Date | null = null;

  constructor(
    public readonly id: string,
    public readonly startedAt: Date,
  ) {}

  addKillEvent(event: KillEvent): void {
    this.killEvents.push(event);

    if (!event.isWorldKill) {
      const killer = this.getOrCreatePlayer(event.killerName);
      killer.addKill(event.weapon, event.timestamp);
    }

    const victim = this.getOrCreatePlayer(event.victimName);
    victim.addDeath();
  }

  endMatch(endedAt: Date): void {
    this.endedAt = endedAt;
  }

  getOrCreatePlayer(name: string): Player {
    if (!this.players.has(name)) {
      this.players.set(name, new Player(name));
    }
    return this.players.get(name)!;
  }

  getRanking(): Player[] {
    return Array.from(this.players.values()).sort((a, b) => {
      if (b.frags !== a.frags) return b.frags - a.frags;
      return a.deaths - b.deaths;
    });
  }

  getWinner(): Player | null {
    const ranking = this.getRanking();
    return ranking.length > 0 ? ranking[0] : null;
  }

  getHighlights(): MatchHighlights {
    const winner = this.getWinner();
    const ranking = this.getRanking();

    let bestStreak: { player: Player; streak: number } | null = null;
    const flawlessPlayers: Player[] = [];
    const frenzyPlayers: Player[] = [];

    for (const player of ranking) {
      if (!bestStreak || player.maxStreak > bestStreak.streak) {
        bestStreak = { player, streak: player.maxStreak };
      }

      if (player === winner && player.hasFlawlessVictory()) {
        flawlessPlayers.push(player);
      }

      if (player.hasFrenzyAward()) {
        frenzyPlayers.push(player);
      }
    }

    return {
      winner,
      winnerFavoriteWeapon: winner?.getFavoriteWeapon() || null,
      bestStreak,
      flawlessPlayers,
      frenzyPlayers,
    };
  }
}

export interface MatchHighlights {
  winner: Player | null;
  winnerFavoriteWeapon: { weapon: string; kills: number } | null;
  bestStreak: { player: Player; streak: number } | null;
  flawlessPlayers: Player[];
  frenzyPlayers: Player[];
}
