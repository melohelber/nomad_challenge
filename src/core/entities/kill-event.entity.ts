export class KillEvent {
  constructor(
    public readonly timestamp: Date,
    public readonly killerName: string,
    public readonly victimName: string,
    public readonly weapon: string,
    public readonly isWorldKill: boolean = false,
  ) {}

  static createPlayerKill(
    timestamp: Date,
    killer: string,
    victim: string,
    weapon: string,
  ): KillEvent {
    return new KillEvent(timestamp, killer, victim, weapon, false);
  }

  static createWorldKill(
    timestamp: Date,
    victim: string,
    cause: string,
  ): KillEvent {
    return new KillEvent(timestamp, '<WORLD>', victim, cause, true);
  }
}
