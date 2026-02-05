import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MatchDbEntity } from './match.db-entity';

@Entity('match_players')
export class MatchPlayerDbEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  matchId: string;

  @Column()
  playerName: string;

  @Column({ nullable: true })
  team: string;

  @Column({ default: 0 })
  frags: number;

  @Column({ default: 0 })
  deaths: number;

  @Column({ default: 0 })
  maxStreak: number;

  @Column({ default: false })
  hasFlawlessAward: boolean;

  @Column({ default: false })
  hasFrenzyAward: boolean;

  @Column({ type: 'simple-json', nullable: true })
  weaponKills: Record<string, number>;

  @ManyToOne(() => MatchDbEntity, (match) => match.players)
  @JoinColumn({ name: 'matchId' })
  match: MatchDbEntity;
}
