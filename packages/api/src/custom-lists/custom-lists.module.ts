import { Module } from '@nestjs/common';
import { AnimeCacheModule } from '../common/anime-cache/anime-cache.module';
import { CustomListsController } from './custom-lists.controller';
import { CustomListsService } from './custom-lists.service';

@Module({
  imports: [AnimeCacheModule],
  controllers: [CustomListsController],
  providers: [CustomListsService],
})
export class CustomListsModule {}
