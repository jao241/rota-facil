import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsIn, IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator';

export class RouteCoordinateDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  lat!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  lon!: number;
}

export class RouteRequestDto {
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => RouteCoordinateDto)
  locations!: RouteCoordinateDto[];

  @IsOptional()
  @IsIn(['auto'])
  costing?: string;
}
