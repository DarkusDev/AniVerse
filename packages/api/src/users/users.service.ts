import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { unlink } from 'fs/promises';
import { PrismaService } from '../common/prisma/prisma.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfileDto } from './dto/user-profile.dto';

const PROFILE_SELECT = {
  id: true,
  email: true,
  username: true,
  avatarUrl: true,
  bio: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: PROFILE_SELECT,
    });

    if (!user) throw new NotFoundException('Usuario no encontrado');

    return user;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    avatarFile?: Express.Multer.File,
  ): Promise<UserProfileDto> {
    if (dto.username) {
      const taken = await this.prisma.user.findFirst({
        where: { username: dto.username, NOT: { id: userId } },
        select: { id: true },
      });
      if (taken) throw new ConflictException('Username ya está en uso');
    }

    // Si se sube nuevo avatar, eliminar el anterior del disco
    if (avatarFile) {
      const current = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true },
      });
      if (current?.avatarUrl) {
        await this.deleteAvatarFile(current.avatarUrl);
      }
    }

    const newAvatarUrl = avatarFile
      ? `/uploads/avatars/${avatarFile.filename}`
      : undefined;

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        ...(newAvatarUrl !== undefined && { avatarUrl: newAvatarUrl }),
      },
      select: PROFILE_SELECT,
    });

    return updated;
  }

  private async deleteAvatarFile(avatarUrl: string): Promise<void> {
    try {
      // avatarUrl es /uploads/avatars/filename.ext
      const relativePath = avatarUrl.startsWith('/') ? avatarUrl.slice(1) : avatarUrl;
      await unlink(`${process.cwd()}/${relativePath}`);
    } catch {
      // Si el archivo no existe no es un error crítico
    }
  }
}
