import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CredentialsDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(12)
  password!: string;
}

export class RegisterDto extends CredentialsDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @MinLength(11)
  @MaxLength(14)
  @Matches(/^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/)
  cpf!: string;
}
