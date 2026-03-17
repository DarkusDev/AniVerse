import { Module } from '@nestjs/common';
import { AniListService } from '../../anime/anilist/anilist.service';
import { AnimeCacheService } from './anime-cache.service';

@Module({
  providers: [AnimeCacheService, AniListService],
  exports: [AnimeCacheService],
})
export class AnimeCacheModule {}
