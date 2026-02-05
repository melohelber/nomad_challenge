export class Player {
  public frags: number = 0;
  public deaths: number = 0;
  public currentStreak: number = 0;
  public maxStreak: number = 0;
  public weaponKills: Map<string, number> = new Map();
  public killTimestamps: Date[] = [];

  constructor(public readonly name: string) {}

  addKill(weapon: string, timestamp: Date): void {
    this.frags++;
    this.currentStreak++;
    if (this.currentStreak > this.maxStreak) {
      this.maxStreak = this.currentStreak;
    }

    const currentCount = this.weaponKills.get(weapon) || 0;
    this.weaponKills.set(weapon, currentCount + 1);

    this.killTimestamps.push(timestamp);
  }

  addDeath(): void {
    this.deaths++;
    this.currentStreak = 0;
  }

  getFavoriteWeapon(): { weapon: string; kills: number } | null {
    if (this.weaponKills.size === 0) return null;

    let maxKills = 0;
    let favoriteWeapon = '';

    for (const [weapon, kills] of this.weaponKills) {
      if (kills > maxKills) {
        maxKills = kills;
        favoriteWeapon = weapon;
      }
    }

    return { weapon: favoriteWeapon, kills: maxKills };
  }

  hasFlawlessVictory(): boolean {
    return this.deaths === 0 && this.frags > 0;
  }

  hasFrenzyAward(): boolean {
    if (this.killTimestamps.length < 5) return false;

    const sortedTimestamps = [...this.killTimestamps].sort(
      (a, b) => a.getTime() - b.getTime(),
    );

    for (let i = 0; i <= sortedTimestamps.length - 5; i++) {
      const firstKill = sortedTimestamps[i];
      const fifthKill = sortedTimestamps[i + 4];
      const diffInMs = fifthKill.getTime() - firstKill.getTime();
      const oneMinuteInMs = 60 * 1000;

      if (diffInMs <= oneMinuteInMs) {
        return true;
      }
    }

    return false;
  }

  getKD(): number {
    if (this.deaths === 0) return this.frags;
    return Math.round((this.frags / this.deaths) * 100) / 100;
  }
}
