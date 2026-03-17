import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CustomList, CustomListEntry, AnimeCache } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AnimeCacheService } from '../common/anime-cache/anime-cache.service';
import type { CreateCustomListDto } from './dto/create-custom-list.dto';
import type { UpdateCustomListDto } from './dto/update-custom-list.dto';

// ─── Response types ───────────────────────────────────────────────────────────

export interface CustomListAnimeEntry {
  animeId: number;
  addedAt: Date;
  anime: {
    titleRomaji: string | null;
    titleEnglish: string | null;
    coverImage: string | null;
    format: string | null;
    episodes: number | null;
    averageScore: number | null;
    genres: string[];
  } | null;
}

export interface CustomListSummary {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  entryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomListDetail extends CustomListSummary {
  entries: CustomListAnimeEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type EntryWithCache = CustomListEntry & { animeCache: AnimeCache | null };

function mapEntry(e: EntryWithCache): CustomListAnimeEntry {
  const c = e.animeCache;
  return {
    animeId: e.animeId,
    addedAt: e.addedAt,
    anime: c
      ? {
          titleRomaji: c.titleRomaji,
          titleEnglish: c.titleEnglish,
          coverImage: c.coverImage,
          format: c.format,
          episodes: c.episodes,
          averageScore: c.averageScore,
          genres: c.genres,
        }
      : null,
  };
}

type ListWithCount = CustomList & { _count: { entries: number } };

function mapSummary(list: ListWithCount): CustomListSummary {
  return {
    id: list.id,
    name: list.name,
    description: list.description,
    isPublic: list.isPublic,
    entryCount: list._count.entries,
    createdAt: list.createdAt,
    updatedAt: list.updatedAt,
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class CustomListsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly animeCache: AnimeCacheService,
  ) {}

  // ── Ownership guard ────────────────────────────────────────────────────────

  private async requireOwner(listId: string, userId: string): Promise<CustomList> {
    const list = await this.prisma.customList.findUnique({ where: { id: listId } });
    if (!list) throw new NotFoundException(`Lista ${listId} no encontrada`);
    if (list.userId !== userId) throw new ForbiddenException('No tienes acceso a esta lista');
    return list;
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────

  async createList(userId: string, dto: CreateCustomListDto): Promise<CustomListSummary> {
    const list = await this.prisma.customList.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description ?? null,
        isPublic: dto.isPublic ?? false,
      },
      include: { _count: { select: { entries: true } } },
    });
    return mapSummary(list);
  }

  async getMyLists(userId: string): Promise<CustomListSummary[]> {
    const lists = await this.prisma.customList.findMany({
      where: { userId },
      include: { _count: { select: { entries: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return lists.map(mapSummary);
  }

  async getList(listId: string, requesterId: string | null): Promise<CustomListDetail> {
    const list = await this.prisma.customList.findUnique({
      where: { id: listId },
      include: {
        _count: { select: { entries: true } },
        entries: {
          include: { animeCache: true },
          orderBy: { addedAt: 'desc' },
        },
      },
    });

    if (!list) throw new NotFoundException(`Lista ${listId} no encontrada`);

    if (!list.isPublic && list.userId !== requesterId) {
      throw new ForbiddenException('Esta lista es privada');
    }

    return {
      ...mapSummary(list),
      entries: list.entries.map(mapEntry),
    };
  }

  async updateList(
    userId: string,
    listId: string,
    dto: UpdateCustomListDto,
  ): Promise<CustomListSummary> {
    await this.requireOwner(listId, userId);

    const updated = await this.prisma.customList.update({
      where: { id: listId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isPublic !== undefined && { isPublic: dto.isPublic }),
      },
      include: { _count: { select: { entries: true } } },
    });

    return mapSummary(updated);
  }

  async deleteList(userId: string, listId: string): Promise<void> {
    await this.requireOwner(listId, userId);
    await this.prisma.customList.delete({ where: { id: listId } });
  }

  // ── Anime entries ──────────────────────────────────────────────────────────

  async addAnime(
    userId: string,
    listId: string,
    animeId: number,
  ): Promise<CustomListAnimeEntry> {
    await this.requireOwner(listId, userId);

    const existing = await this.prisma.customListEntry.findUnique({
      where: { customListId_animeId: { customListId: listId, animeId } },
      select: { animeId: true },
    });

    if (existing) {
      throw new ConflictException(`El anime ${animeId} ya está en esta lista`);
    }

    // Garantiza caché local; lanza si el ID no existe en AniList
    await this.animeCache.ensure(animeId);

    const entry = await this.prisma.customListEntry.create({
      data: { customListId: listId, animeId },
      include: { animeCache: true },
    });

    return mapEntry(entry);
  }

  async removeAnime(userId: string, listId: string, animeId: number): Promise<void> {
    await this.requireOwner(listId, userId);

    const existing = await this.prisma.customListEntry.findUnique({
      where: { customListId_animeId: { customListId: listId, animeId } },
      select: { animeId: true },
    });

    if (!existing) {
      throw new NotFoundException(`El anime ${animeId} no está en esta lista`);
    }

    await this.prisma.customListEntry.delete({
      where: { customListId_animeId: { customListId: listId, animeId } },
    });
  }
}
