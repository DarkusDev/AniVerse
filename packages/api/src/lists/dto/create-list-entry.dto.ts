import { AnimeStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateListEntryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  animeId!: number;

  @IsEnum(AnimeStatus)
  status!: AnimeStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  episodesWatched?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalEpisodes?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  finishDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
