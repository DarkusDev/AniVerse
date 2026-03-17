import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { AccessRequestUser } from '../auth/types/request-user.type';
import { ListsService, type ListEntryResponse, type PaginatedListResponse } from './lists.service';
import { CreateListEntryDto } from './dto/create-list-entry.dto';
import { UpdateListEntryDto } from './dto/update-list-entry.dto';
import { ListQueryDto } from './dto/list-query.dto';

@UseGuards(JwtAccessGuard)
@Controller('lists')
export class ListsController {
  constructor(private readonly listsService: ListsService) {}

  /**
   * GET /api/lists/me?status=&page=&perPage=
   * Lista completa del usuario autenticado con filtro opcional por estado.
   */
  @Get('me')
  getMyList(
    @GetUser() user: AccessRequestUser,
    @Query() query: ListQueryDto,
  ): Promise<PaginatedListResponse> {
    return this.listsService.getMyList(user.userId, query);
  }

  /**
   * GET /api/lists/me/:animeId
   * Entrada individual de la lista del usuario.
   */
  @Get('me/:animeId')
  getEntry(
    @GetUser() user: AccessRequestUser,
    @Param('animeId', ParseIntPipe) animeId: number,
  ): Promise<ListEntryResponse> {
    return this.listsService.getEntry(user.userId, animeId);
  }

  /**
   * POST /api/lists/me
   * Añade un anime a la lista. Descarga y persiste los datos del anime localmente.
   */
  @Post('me')
  @HttpCode(HttpStatus.CREATED)
  createEntry(
    @GetUser() user: AccessRequestUser,
    @Body() dto: CreateListEntryDto,
  ): Promise<ListEntryResponse> {
    return this.listsService.createEntry(user.userId, dto);
  }

  /**
   * PATCH /api/lists/me/:animeId
   * Actualiza parcialmente una entrada (estado, puntuación, episodios, fechas, notas).
   */
  @Patch('me/:animeId')
  updateEntry(
    @GetUser() user: AccessRequestUser,
    @Param('animeId', ParseIntPipe) animeId: number,
    @Body() dto: UpdateListEntryDto,
  ): Promise<ListEntryResponse> {
    return this.listsService.updateEntry(user.userId, animeId, dto);
  }

  /**
   * DELETE /api/lists/me/:animeId
   * Elimina un anime de la lista del usuario.
   */
  @Delete('me/:animeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteEntry(
    @GetUser() user: AccessRequestUser,
    @Param('animeId', ParseIntPipe) animeId: number,
  ): Promise<void> {
    return this.listsService.deleteEntry(user.userId, animeId);
  }
}
