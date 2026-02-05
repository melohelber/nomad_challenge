import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  MatchDbEntity,
  MatchPlayerDbEntity,
  KillEventDbEntity,
} from './entities';
import { MatchRepository } from './repositories';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'better-sqlite3',
      database: 'database.sqlite',
      entities: [MatchDbEntity, MatchPlayerDbEntity, KillEventDbEntity],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([
      MatchDbEntity,
      MatchPlayerDbEntity,
      KillEventDbEntity,
    ]),
  ],
  providers: [MatchRepository],
  exports: [TypeOrmModule, MatchRepository],
})
export class DatabaseModule {}
