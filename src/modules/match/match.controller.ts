import {
  Controller,
  Get,
  Post,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Render,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MatchService } from './match.service';

@Controller()
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Get()
  @Render('index')
  async index() {
    const matches = await this.matchService.getAllMatches();
    return { matches };
  }

  @Post('api/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLog(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const content = file.buffer.toString('utf-8');
    const result = await this.matchService.processLog(content);

    return {
      success: true,
      matchesProcessed: result.processedMatches.length,
      matches: result.processedMatches.map((pm) => ({
        matchId: pm.ranking.matchId,
        startedAt: pm.ranking.startedAt,
        endedAt: pm.ranking.endedAt,
        ranking: pm.ranking.ranking,
        highlights: pm.highlights.highlights,
      })),
    };
  }

  @Get('api/matches')
  async getAllMatches() {
    const matches = await this.matchService.getAllMatches();
    return { matches };
  }

  @Get('api/matches/:id')
  async getMatch(@Param('id') id: string) {
    const match = await this.matchService.getMatchById(id);
    if (!match) {
      throw new BadRequestException('Match not found');
    }
    return { match };
  }

  @Get('api/ranking/global')
  async getGlobalRanking() {
    const ranking = await this.matchService.getGlobalRanking();
    return { ranking };
  }
}
