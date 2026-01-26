import { IsEnum, IsNotEmpty } from 'class-validator';
import { ReportReason } from '../entities/report.entity';

export class CreateReportDto {
  @IsNotEmpty({ message: '신고 사유를 선택해주세요.' })
  @IsEnum(ReportReason, { message: '유효하지 않은 신고 사유입니다.' })
  reason: ReportReason;
}
