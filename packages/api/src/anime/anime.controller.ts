import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { AnimeService } from './anime.service';
import { AnimeQueryDto } from './dto/anime-query.dto';
import type { AnimeDetailDto, PaginatedAnimeDto } from './dto/anime-response.dto';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

// DTO local para paginación simple (trending / seasonal)
class PageDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  perPage?: number;
}

@Controller('anime')
export class AnimeController {
  constructor(private readonly animeService: AnimeService) {}

  /**
   * GET /api/anime?q=&genre=&year=&sort=&page=&perPage=
   * Búsqueda y filtrado general con paginación.
   */
  @Get()
  search(@Query() dto: AnimeQueryDto): Promise<PaginatedAnimeDto> {
    return this.animeService.search(dto);
  }

  /**
   * GET /api/anime/trending?page=&perPage=
   * Anime en tendencia global ahora mismo.
   * ⚠ Debe declararse ANTES de :id para que NestJS no lo capture como parámetro.
   */
  @Get('trending')
  trending(@Query() dto: PageDto): Promise<PaginatedAnimeDto> {
    return this.animeService.getTrending(dto.page, dto.perPage);
  }

  /**
   * GET /api/anime/seasonal?page=&perPage=
   * Anime de la temporada actual calculada automáticamente.
   */
  @Get('seasonal')
  seasonal(@Query() dto: PageDto): Promise<PaginatedAnimeDto> {
    return this.animeService.getSeasonal(dto.page, dto.perPage);
  }

  /**
   * GET /api/anime/:id
   * Detalle completo de un anime por ID de AniList.
   */
  @Get(':id')
  async getById(@Param('id', ParseIntPipe) id: number): Promise<AnimeDetailDto> {
    try {
      return await this.animeService.getById(id);
    } catch (err) {
      // AniList devuelve error cuando el ID no existe
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.toLowerCase().includes('not found') || msg.includes('404')) {
        throw new NotFoundException(`Anime con id ${id} no encontrado`);
      }
      throw err;
    }
  }
}
