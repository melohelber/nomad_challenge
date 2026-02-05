import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { MatchPlayerDbEntity } from './match-player.db-entity';
import { KillEventDbEntity } from './kill-event.db-entity';

@Entity('matches')
export class MatchDbEntity {
  @PrimaryColumn()
  id: string;

  @Column({ type: 'datetime' })
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  endedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  winnerName: string | null;

  @Column({ type: 'text', nullable: true })
  winnerWeapon: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => MatchPlayerDbEntity, (player) => player.match, {
    cascade: true,
  })
  players: MatchPlayerDbEntity[];

  @OneToMany(() => KillEventDbEntity, (event) => event.match, {
    cascade: true,
  })
  killEvents: KillEventDbEntity[];
}
