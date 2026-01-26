import { IsOptional, IsDateString, IsIn } from 'class-validator';

export class DashboardQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsIn(['login', 'activity'])
  dauType?: 'login' | 'activity';
}
