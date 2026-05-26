import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, ValidateNested } from 'class-validator';

export class CourseMenuLinkItemDto {
  @Type(() => Number)
  @IsInt()
  menuNodeId: number;

  @IsBoolean()
  enabled: boolean;

  @Type(() => Number)
  @IsInt()
  sortOrder: number;
}

export class ReplaceCourseMenuLinksDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CourseMenuLinkItemDto)
  items: CourseMenuLinkItemDto[];
}
