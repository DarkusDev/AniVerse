import { IsString, MinLength, MaxLength } from 'class-validator';

export class StartImportDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  username!: string;
}
