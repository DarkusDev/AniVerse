import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const VALID_SORTS = ['SCORE', 'POPULARITY', 'TRENDING', 'NEWEST', 'TITLE'] as const;

export class AnimeQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1940)
  @Max(2100)
  year?: number;

  @IsOptional()
  @IsString()
  format?: string;

  @IsOptional()
  @IsIn(VALID_SORTS)
  sort?: string;

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
