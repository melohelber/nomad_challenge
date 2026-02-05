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
    hasTeams: boolean = false,
  ): KillEvent {
    // Only parse team prefixes in team mode
    if (hasTeams) {
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

    // Standard mode: use names as-is, no team parsing
    return new KillEvent(
      timestamp,
      killer,
      victim,
      weapon,
      false,
      undefined,
      undefined,
    );
  }

  static createWorldKill(
    timestamp: Date,
    victim: string,
    cause: string,
    hasTeams: boolean = false,
  ): KillEvent {
    // Only parse team prefixes in team mode
    if (hasTeams) {
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

    // Standard mode: use name as-is
    return new KillEvent(
      timestamp,
      '<WORLD>',
      victim,
      cause,
      true,
      undefined,
      undefined,
    );
  }
}
