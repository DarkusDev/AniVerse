import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { AccessRequestUser } from '../auth/types/request-user.type';
import {
  CustomListsService,
  type CustomListSummary,
  type CustomListDetail,
  type CustomListAnimeEntry,
} from './custom-lists.service';
import { CreateCustomListDto } from './dto/create-custom-list.dto';
import { UpdateCustomListDto } from './dto/update-custom-list.dto';
import { AddAnimeToListDto } from './dto/add-anime-to-list.dto';

@UseGuards(JwtAccessGuard)
@Controller('custom-lists')
export class CustomListsController {
  constructor(private readonly customListsService: CustomListsService) {}

  /**
   * POST /api/custom-lists
   * Crea una nueva lista personalizada para el usuario autenticado.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  createList(
    @GetUser() user: AccessRequestUser,
    @Body() dto: CreateCustomListDto,
  ): Promise<CustomListSummary> {
    return this.customListsService.createList(user.userId, dto);
  }

  /**
   * GET /api/custom-lists/me
   * Devuelve todas las listas del usuario autenticado con número de entradas.
   * ⚠ Debe ir ANTES de :id para que NestJS no lo capture como parámetro.
   */
  @Get('me')
  getMyLists(@GetUser() user: AccessRequestUser): Promise<CustomListSummary[]> {
    return this.customListsService.getMyLists(user.userId);
  }

  /**
   * GET /api/custom-lists/:id
   * Devuelve una lista con sus entradas. Las privadas solo las ve el propietario.
   */
  @Get(':id')
  getList(
    @GetUser() user: AccessRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomListDetail> {
    return this.customListsService.getList(id, user.userId);
  }

  /**
   * PATCH /api/custom-lists/:id
   * Actualiza nombre, descripción o visibilidad de una lista propia.
   */
  @Patch(':id')
  updateList(
    @GetUser() user: AccessRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomListDto,
  ): Promise<CustomListSummary> {
    return this.customListsService.updateList(user.userId, id, dto);
  }

  /**
   * DELETE /api/custom-lists/:id
   * Elimina una lista propia y todas sus entradas (Cascade).
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteList(
    @GetUser() user: AccessRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.customListsService.deleteList(user.userId, id);
  }

  /**
   * POST /api/custom-lists/:id/anime
   * Añade un anime a la lista. Descarga y persiste datos del anime localmente.
   */
  @Post(':id/anime')
  @HttpCode(HttpStatus.CREATED)
  addAnime(
    @GetUser() user: AccessRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddAnimeToListDto,
  ): Promise<CustomListAnimeEntry> {
    return this.customListsService.addAnime(user.userId, id, dto.animeId);
  }

  /**
   * DELETE /api/custom-lists/:id/anime/:animeId
   * Elimina un anime de la lista.
   */
  @Delete(':id/anime/:animeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAnime(
    @GetUser() user: AccessRequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('animeId', ParseIntPipe) animeId: number,
  ): Promise<void> {
    return this.customListsService.removeAnime(user.userId, id, animeId);
  }
}
