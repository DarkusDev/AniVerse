import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import type { AccessRequestUser } from '../auth/types/request-user.type';
import { avatarMulterOptions } from '../common/multer/avatar.multer';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { UserProfileDto } from './dto/user-profile.dto';

@UseGuards(JwtAccessGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  getMe(@GetUser() user: AccessRequestUser): Promise<UserProfileDto> {
    return this.usersService.getProfile(user.userId);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('avatar', avatarMulterOptions))
  updateMe(
    @GetUser() user: AccessRequestUser,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<UserProfileDto> {
    return this.usersService.updateProfile(user.userId, dto, file);
  }
}
