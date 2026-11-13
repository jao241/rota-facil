import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateMapDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}

export class UpdateMapDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;
}

export class GrantMapAccessDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
}
