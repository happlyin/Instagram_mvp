import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCaptionDto {
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  text?: string;

  @IsBoolean()
  @IsOptional()
  isBold?: boolean;

  @IsBoolean()
  @IsOptional()
  isItalic?: boolean;

  @IsInt()
  @Min(10)
  @Max(32)
  @IsOptional()
  fontSize?: number;
}

export class CreatePostDto {
  @ValidateNested()
  @Type(() => CreateCaptionDto)
  @IsOptional()
  caption?: CreateCaptionDto;
}
