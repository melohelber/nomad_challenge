import { Injectable } from '@nestjs/common';
import { ParseLogUseCase } from '../../core/use-cases/parse-log.use-case';
import { CalculateRankingUseCase, MatchRanking } from '../../core/use-cases/calculate-ranking.use-case';
import { GetHighlightsUseCase, MatchHighlightsResult } from '../../core/use-cases/get-highlights.use-case';
import { MatchRepository } from '../../infra/database/repositories/match.repository';
import { Match } from '../../core/entities';
import { MatchDbEntity } from '../../infra/database/entities';

export interface ProcessedMatch {
  match: Match;
  ranking: MatchRanking;
  highlights: MatchHighlightsResult;
}

export interface ProcessLogResult {
  processedMatches: ProcessedMatch[];
  savedMatches: MatchDbEntity[];
}

@Injectable()
export class MatchService {
  constructor(
    private readonly parseLogUseCase: ParseLogUseCase,
    private readonly calculateRankingUseCase: CalculateRankingUseCase,
    private readonly getHighlightsUseCase: GetHighlightsUseCase,
    private readonly matchRepository: MatchRepository,
  ) {}

  async processLog(logContent: string): Promise<ProcessLogResult> {
    const { matches } = this.parseLogUseCase.execute(logContent);

    const processedMatches: ProcessedMatch[] = matches.map((match) => ({
      match,
      ranking: this.calculateRankingUseCase.execute(match),
      highlights: this.getHighlightsUseCase.execute(match),
    }));

    const savedMatches = await this.matchRepository.saveMany(matches);

    return { processedMatches, savedMatches };
  }

  async getAllMatches(): Promise<MatchDbEntity[]> {
    return this.matchRepository.findAll();
  }

  async getMatchById(id: string): Promise<MatchDbEntity | null> {
    return this.matchRepository.findById(id);
  }

  async getGlobalRanking() {
    return this.matchRepository.getGlobalRanking();
  }
}
