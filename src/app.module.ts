import { Module } from '@nestjs/common';
import { MatchModule } from './modules/match/match.module';
import { WebsocketModule } from './modules/websocket/websocket.module';

@Module({
  imports: [MatchModule, WebsocketModule],
})
export class AppModule {}
