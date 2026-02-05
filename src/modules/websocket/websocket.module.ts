import { Module } from '@nestjs/common';
import { RankingGateway } from './ranking.gateway';
import { ParseLogUseCase } from '../../core/use-cases/parse-log.use-case';
import { CalculateRankingUseCase } from '../../core/use-cases/calculate-ranking.use-case';
import { GetHighlightsUseCase } from '../../core/use-cases/get-highlights.use-case';
import { LogParserService } from '../../infra/parsers/log-parser.service';
import { DatabaseModule } from '../../infra/database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [
    RankingGateway,
    ParseLogUseCase,
    CalculateRankingUseCase,
    GetHighlightsUseCase,
    LogParserService,
  ],
})
export class WebsocketModule {}
