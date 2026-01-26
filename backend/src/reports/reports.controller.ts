import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';

interface AuthenticatedRequest extends Request {
  user: { userId: string };
}

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post(':postId/report')
  @HttpCode(HttpStatus.CREATED)
  async reportPost(
    @Param('postId') postId: string,
    @Body() createReportDto: CreateReportDto,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.reportsService.createReport(
      req.user.userId,
      postId,
      createReportDto.reason,
    );
    return { message: '게시물이 신고되었습니다.' };
  }
}
