import { Injectable } from '@nestjs/common';
import { LogParserService, LogEvent } from '../../infra/parsers';
import { Match } from '../entities';

export interface ParseLogResult {
  matches: Match[];
  events: LogEvent[];
}

@Injectable()
export class ParseLogUseCase {
  constructor(private readonly logParser: LogParserService) {}

  execute(logContent: string): ParseLogResult {
    return this.logParser.parseLogWithEvents(logContent);
  }
}
