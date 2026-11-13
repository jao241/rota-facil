import { ArrayNotEmpty, IsArray, IsBoolean, IsNumber, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateMapPointDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  longitude!: number;
}

export class UpdateMapPointDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name!: string | null;
}

export class ReorderMapPointsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  pointIds!: string[];
}

export class SetMapPointVisitedDto {
  @IsBoolean()
  visited!: boolean;
}
