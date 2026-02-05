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

  @Column()
  startedAt: Date;

  @Column({ nullable: true })
  endedAt: Date;

  @Column({ nullable: true })
  winnerName: string;

  @Column({ nullable: true })
  winnerWeapon: string;

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
