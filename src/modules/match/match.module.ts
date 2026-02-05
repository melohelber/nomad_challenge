import { Module } from '@nestjs/common';
import { MatchController } from './match.controller';
import { MatchService } from './match.service';
import { ParseLogUseCase } from '../../core/use-cases/parse-log.use-case';
import { CalculateRankingUseCase } from '../../core/use-cases/calculate-ranking.use-case';
import { GetHighlightsUseCase } from '../../core/use-cases/get-highlights.use-case';
import { LogParserService } from '../../infra/parsers/log-parser.service';
import { DatabaseModule } from '../../infra/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MatchController],
  providers: [
    MatchService,
    ParseLogUseCase,
    CalculateRankingUseCase,
    GetHighlightsUseCase,
    LogParserService,
  ],
})
export class MatchModule {}
