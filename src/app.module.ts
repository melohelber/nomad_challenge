import { Module } from '@nestjs/common';
import { MatchModule } from './modules/match/match.module';

@Module({
  imports: [MatchModule],
})
export class AppModule {}
