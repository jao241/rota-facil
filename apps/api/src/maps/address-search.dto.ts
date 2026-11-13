import { IsString, MaxLength, MinLength } from 'class-validator';

export class AddressSearchQueryDto {
  @IsString()
  @MinLength(4)
  @MaxLength(200)
  text!: string;
}
