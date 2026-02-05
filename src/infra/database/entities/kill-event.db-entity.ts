import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MatchDbEntity } from './match.db-entity';

@Entity('kill_events')
export class KillEventDbEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  matchId: string;

  @Column({ type: 'datetime' })
  timestamp: Date;

  @Column()
  killerName: string;

  @Column()
  victimName: string;

  @Column()
  weapon: string;

  @Column({ default: false })
  isWorldKill: boolean;

  @ManyToOne(() => MatchDbEntity, (match) => match.killEvents)
  @JoinColumn({ name: 'matchId' })
  match: MatchDbEntity;
}
