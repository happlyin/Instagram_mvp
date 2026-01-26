import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, ReportReason } from './entities/report.entity';
import { Post } from '../posts/entities/post.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private reportsRepository: Repository<Report>,
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
  ) {}

  async createReport(
    reporterId: string,
    postId: string,
    reason: ReportReason,
  ): Promise<Report> {
    // 게시물 존재 확인
    const post = await this.postsRepository.findOne({
      where: { id: postId },
    });
    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }

    // 중복 신고 확인
    const existingReport = await this.reportsRepository.findOne({
      where: { reporterId, postId },
    });
    if (existingReport) {
      throw new ConflictException('이미 신고한 게시물입니다.');
    }

    // 신고 생성
    const report = this.reportsRepository.create({
      reporterId,
      postId,
      reason,
    });

    return await this.reportsRepository.save(report);
  }

  async getReportedPostIdsByUser(userId: string): Promise<string[]> {
    const reports = await this.reportsRepository.find({
      where: { reporterId: userId },
      select: ['postId'],
    });
    return reports.map((r) => r.postId);
  }

  async getReportsForPost(postId: string): Promise<Report[]> {
    return await this.reportsRepository.find({
      where: { postId },
      relations: ['reporter'],
      order: { createdAt: 'DESC' },
    });
  }

  async getReportCountForPost(postId: string): Promise<number> {
    const reports = await this.reportsRepository.find({
      where: { postId },
    });
    return reports.length;
  }
}
