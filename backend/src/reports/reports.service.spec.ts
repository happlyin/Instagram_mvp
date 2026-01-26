import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Report, ReportReason } from './entities/report.entity';
import { Post } from '../posts/entities/post.entity';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockReport: Report = {
    id: 'report-1',
    reporterId: 'user-1',
    reporter: null as any,
    postId: 'post-1',
    post: null as any,
    reason: ReportReason.SPAM,
    createdAt: new Date(),
  };

  const mockPost: Post = {
    id: 'post-1',
    userId: 'author-1',
    user: null as any,
    images: [],
    captions: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockReportsRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockPostsRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: getRepositoryToken(Report),
          useValue: mockReportsRepository,
        },
        {
          provide: getRepositoryToken(Post),
          useValue: mockPostsRepository,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReport', () => {
    it('신고를 생성하고 Report 객체를 반환해야 한다', async () => {
      mockPostsRepository.findOne.mockResolvedValue(mockPost);
      mockReportsRepository.findOne.mockResolvedValue(null);
      mockReportsRepository.create.mockReturnValue(mockReport);
      mockReportsRepository.save.mockResolvedValue(mockReport);

      const result = await service.createReport('user-1', 'post-1', ReportReason.SPAM);

      expect(result).toEqual(mockReport);
      expect(mockPostsRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'post-1' },
      });
      expect(mockReportsRepository.findOne).toHaveBeenCalledWith({
        where: { reporterId: 'user-1', postId: 'post-1' },
      });
      expect(mockReportsRepository.create).toHaveBeenCalledWith({
        reporterId: 'user-1',
        postId: 'post-1',
        reason: ReportReason.SPAM,
      });
      expect(mockReportsRepository.save).toHaveBeenCalled();
    });

    it('이미 신고한 게시물을 다시 신고하면 ConflictException을 던져야 한다', async () => {
      mockPostsRepository.findOne.mockResolvedValue(mockPost);
      mockReportsRepository.findOne.mockResolvedValue(mockReport);

      await expect(
        service.createReport('user-1', 'post-1', ReportReason.SPAM),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.createReport('user-1', 'post-1', ReportReason.SPAM),
      ).rejects.toThrow('이미 신고한 게시물입니다.');
    });

    it('존재하지 않는 게시물 신고 시 NotFoundException을 던져야 한다', async () => {
      mockPostsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createReport('user-1', 'non-existent', ReportReason.SPAM),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createReport('user-1', 'non-existent', ReportReason.SPAM),
      ).rejects.toThrow('게시물을 찾을 수 없습니다.');
    });
  });

  describe('getReportedPostIdsByUser', () => {
    it('유저가 신고한 모든 게시물 ID를 반환해야 한다', async () => {
      const reports = [
        { postId: 'post-1' },
        { postId: 'post-2' },
        { postId: 'post-3' },
      ];
      mockReportsRepository.find.mockResolvedValue(reports);

      const result = await service.getReportedPostIdsByUser('user-1');

      expect(result).toEqual(['post-1', 'post-2', 'post-3']);
      expect(mockReportsRepository.find).toHaveBeenCalledWith({
        where: { reporterId: 'user-1' },
        select: ['postId'],
      });
    });

    it('신고한 게시물이 없으면 빈 배열을 반환해야 한다', async () => {
      mockReportsRepository.find.mockResolvedValue([]);

      const result = await service.getReportedPostIdsByUser('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getReportsForPost', () => {
    it('특정 게시물의 모든 신고 목록을 반환해야 한다', async () => {
      const reports = [mockReport];
      mockReportsRepository.find.mockResolvedValue(reports);

      const result = await service.getReportsForPost('post-1');

      expect(result).toEqual(reports);
      expect(mockReportsRepository.find).toHaveBeenCalledWith({
        where: { postId: 'post-1' },
        relations: ['reporter'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getReportCountForPost', () => {
    it('특정 게시물의 신고 횟수를 반환해야 한다', async () => {
      const reports = [mockReport, mockReport];
      mockReportsRepository.find.mockResolvedValue(reports);

      const result = await service.getReportCountForPost('post-1');

      expect(result).toBe(2);
    });
  });
});
