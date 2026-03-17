import { Module } from '@nestjs/common';
import { AnimeCacheModule } from '../common/anime-cache/anime-cache.module';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';

@Module({
  imports: [AnimeCacheModule],
  controllers: [ListsController],
  providers: [ListsService],
})
export class ListsModule {}
