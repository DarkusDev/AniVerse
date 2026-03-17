import { Module } from '@nestjs/common';
import { AniListService } from './anilist/anilist.service';
import { AnimeController } from './anime.controller';
import { AnimeService } from './anime.service';

@Module({
  controllers: [AnimeController],
  providers: [AnimeService, AniListService],
})
export class AnimeModule {}
