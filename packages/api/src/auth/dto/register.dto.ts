import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'username solo puede contener letras, números y guiones bajos',
  })
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}
