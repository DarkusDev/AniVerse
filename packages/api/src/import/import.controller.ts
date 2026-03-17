import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { AccessRequestUser } from '../auth/types/request-user.type';
import { ImportService } from './import.service';
import { StartImportDto } from './dto/start-import.dto';

@Controller('import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * POST /api/import/mal
   * Inicia la importación desde MyAnimeList. Requiere autenticación.
   * Devuelve el jobId para seguir el progreso vía SSE.
   */
  @Post('mal')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAccessGuard)
  startMalImport(
    @GetUser() user: AccessRequestUser,
    @Body() dto: StartImportDto,
  ): { jobId: string } {
    const jobId = this.importService.startMalImport(user.userId, dto.username);
    return { jobId };
  }

  /**
   * POST /api/import/anilist
   * Inicia la importación desde AniList. Requiere autenticación.
   */
  @Post('anilist')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAccessGuard)
  startAniListImport(
    @GetUser() user: AccessRequestUser,
    @Body() dto: StartImportDto,
  ): { jobId: string } {
    const jobId = this.importService.startAniListImport(user.userId, dto.username);
    return { jobId };
  }

  /**
   * GET /api/import/progress/:jobId  (SSE)
   * Stream de progreso. No requiere autenticación: el jobId es opaco y actúa
   * como bearer implícito. Se cierra automáticamente al completar o fallar.
   */
  @Sse('progress/:jobId')
  streamProgress(@Param('jobId') jobId: string): Observable<MessageEvent> {
    // Validate the job exists before opening the stream
    if (!this.importService.getJob(jobId)) {
      throw new NotFoundException(`Job ${jobId} no encontrado`);
    }

    return new Observable<MessageEvent>((subscriber) => {
      const interval = setInterval(() => {
        const job = this.importService.getJob(jobId);

        if (!job) {
          subscriber.next({ data: { status: 'not_found' } } as MessageEvent);
          subscriber.complete();
          clearInterval(interval);
          return;
        }

        subscriber.next({ data: job } as MessageEvent);

        if (job.status === 'done' || job.status === 'error') {
          // Brief pause so the client receives the final payload before close
          setTimeout(() => {
            subscriber.complete();
          }, 200);
          clearInterval(interval);
        }
      }, 500);

      // Cleanup when the client disconnects
      return () => clearInterval(interval);
    });
  }

  /**
   * GET /api/import/status/:jobId
   * Polling alternativo (para clientes que no soportan SSE).
   */
  @Get('status/:jobId')
  getStatus(@Param('jobId') jobId: string) {
    const job = this.importService.getJob(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} no encontrado`);
    return job;
  }
}
