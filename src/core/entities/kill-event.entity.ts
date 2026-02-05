export type Team = 'TR' | 'CT';

export class KillEvent {
  public readonly killerTeam?: Team;
  public readonly victimTeam?: Team;
  public readonly isFriendlyFire: boolean;

  constructor(
    public readonly timestamp: Date,
    public readonly killerName: string,
    public readonly victimName: string,
    public readonly weapon: string,
    public readonly isWorldKill: boolean = false,
    killerTeam?: Team,
    victimTeam?: Team,
  ) {
    this.killerTeam = killerTeam;
    this.victimTeam = victimTeam;
    this.isFriendlyFire = !isWorldKill && killerTeam !== undefined && killerTeam === victimTeam;
  }

  static parseTeamFromName(name: string): { team?: Team; cleanName: string } {
    const teamMatch = name.match(/^\[(TR|CT)\](.+)$/);
    if (teamMatch) {
      return {
        team: teamMatch[1] as Team,
        cleanName: teamMatch[2],
      };
    }
    return { cleanName: name };
  }

  static createPlayerKill(
    timestamp: Date,
    killer: string,
    victim: string,
    weapon: string,
  ): KillEvent {
    const { team: killerTeam, cleanName: killerName } = this.parseTeamFromName(killer);
    const { team: victimTeam, cleanName: victimName } = this.parseTeamFromName(victim);

    return new KillEvent(
      timestamp,
      killerName,
      victimName,
      weapon,
      false,
      killerTeam,
      victimTeam,
    );
  }

  static createWorldKill(
    timestamp: Date,
    victim: string,
    cause: string,
  ): KillEvent {
    const { team: victimTeam, cleanName: victimName } = this.parseTeamFromName(victim);

    return new KillEvent(
      timestamp,
      '<WORLD>',
      victimName,
      cause,
      true,
      undefined,
      victimTeam,
    );
  }
}
