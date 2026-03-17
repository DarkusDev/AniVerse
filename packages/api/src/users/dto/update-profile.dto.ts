import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username solo puede contener letras, números y guiones bajos',
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}
