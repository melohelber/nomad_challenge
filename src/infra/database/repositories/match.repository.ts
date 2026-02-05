import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MatchDbEntity,
  MatchPlayerDbEntity,
  KillEventDbEntity,
} from '../entities';
import { Match, Player } from '../../../core/entities';

@Injectable()
export class MatchRepository {
  constructor(
    @InjectRepository(MatchDbEntity)
    private readonly matchRepo: Repository<MatchDbEntity>,
    @InjectRepository(MatchPlayerDbEntity)
    private readonly playerRepo: Repository<MatchPlayerDbEntity>,
    @InjectRepository(KillEventDbEntity)
    private readonly killEventRepo: Repository<KillEventDbEntity>,
  ) {}

  async save(match: Match): Promise<MatchDbEntity> {
    const winner = match.getWinner();
    const favoriteWeapon = winner?.getFavoriteWeapon();

    const matchEntity = this.matchRepo.create({
      id: match.id,
      startedAt: match.startedAt,
      endedAt: match.endedAt,
      winnerName: winner?.name || null,
      winnerWeapon: favoriteWeapon?.weapon || null,
    });

    await this.matchRepo.save(matchEntity);

    for (const player of match.players.values()) {
      const playerEntity = this.playerRepo.create({
        matchId: match.id,
        playerName: player.name,
        frags: player.frags,
        deaths: player.deaths,
        maxStreak: player.maxStreak,
        hasFlawlessAward: player === winner && player.hasFlawlessVictory(),
        hasFrenzyAward: player.hasFrenzyAward(),
        weaponKills: Object.fromEntries(player.weaponKills),
      });
      await this.playerRepo.save(playerEntity);
    }

    for (const event of match.killEvents) {
      const eventEntity = this.killEventRepo.create({
        matchId: match.id,
        timestamp: event.timestamp,
        killerName: event.killerName,
        victimName: event.victimName,
        weapon: event.weapon,
        isWorldKill: event.isWorldKill,
      });
      await this.killEventRepo.save(eventEntity);
    }

    return matchEntity;
  }

  async saveMany(matches: Match[]): Promise<MatchDbEntity[]> {
    const results: MatchDbEntity[] = [];
    for (const match of matches) {
      const saved = await this.save(match);
      results.push(saved);
    }
    return results;
  }

  async findAll(): Promise<MatchDbEntity[]> {
    return this.matchRepo.find({
      relations: ['players', 'killEvents'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<MatchDbEntity | null> {
    return this.matchRepo.findOne({
      where: { id },
      relations: ['players', 'killEvents'],
    });
  }

  async getGlobalRanking(): Promise<
    { playerName: string; totalFrags: number; totalDeaths: number; matchesPlayed: number }[]
  > {
    const result = await this.playerRepo
      .createQueryBuilder('player')
      .select('player.playerName', 'playerName')
      .addSelect('SUM(player.frags)', 'totalFrags')
      .addSelect('SUM(player.deaths)', 'totalDeaths')
      .addSelect('COUNT(player.matchId)', 'matchesPlayed')
      .groupBy('player.playerName')
      .orderBy('totalFrags', 'DESC')
      .getRawMany();

    return result.map((r) => ({
      playerName: r.playerName,
      totalFrags: Number(r.totalFrags),
      totalDeaths: Number(r.totalDeaths),
      matchesPlayed: Number(r.matchesPlayed),
    }));
  }
}
