import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { Report, ReportReason } from '../reports/entities/report.entity';
import { Comment } from '../comments/entities/comment.entity';
import { Like } from '../likes/entities/like.entity';

describe('AdminService', () => {
  let service: AdminService;

  const mockUsers = [
    {
      id: 'user-1',
      email: 'user1@test.com',
      username: 'user1',
      role: UserRole.USER,
      isSuspended: false,
      createdAt: new Date('2025-01-01'),
      lastLoginAt: new Date('2025-01-20'),
    },
    {
      id: 'user-2',
      email: 'user2@test.com',
      username: 'user2',
      role: UserRole.USER,
      isSuspended: true,
      createdAt: new Date('2025-01-02'),
      lastLoginAt: new Date('2025-01-15'),
    },
    {
      id: 'admin-1',
      email: 'admin',
      username: 'admin',
      role: UserRole.ADMIN,
      isSuspended: false,
      createdAt: new Date('2025-01-01'),
      lastLoginAt: new Date('2025-01-25'),
    },
  ];

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
  };

  const mockManager = {
    query: jest.fn(),
  };

  const mockUserRepository = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
    findOne: jest.fn(),
    update: jest.fn(),
    manager: mockManager,
  };

  const mockPosts = [
    {
      id: 'post-1',
      userId: 'user-1',
      user: { id: 'user-1', username: 'user1' },
      images: [{ id: 'img-1', imageUrl: '/uploads/img1.jpg', orderIndex: 0 }],
      isDeleted: false,
      createdAt: new Date('2025-01-22'),
    },
    {
      id: 'post-2',
      userId: 'user-2',
      user: { id: 'user-2', username: 'user2' },
      images: [{ id: 'img-2', imageUrl: '/uploads/img2.jpg', orderIndex: 0 }],
      isDeleted: false,
      createdAt: new Date('2025-01-21'),
    },
  ];

  const mockReports = [
    {
      id: 'report-1',
      reporterId: 'user-3',
      reporter: { id: 'user-3', username: 'reporter1' },
      postId: 'post-1',
      reason: ReportReason.SPAM,
      createdAt: new Date('2025-01-23'),
    },
  ];

  const mockPostQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn(),
    getMany: jest.fn(),
  };

  const mockPostRepository = {
    createQueryBuilder: jest.fn(() => mockPostQueryBuilder),
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockReportRepository = {
    find: jest.fn(),
    delete: jest.fn(),
  };

  const mockCommentRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockLikeRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Post),
          useValue: mockPostRepository,
        },
        {
          provide: getRepositoryToken(Report),
          useValue: mockReportRepository,
        },
        {
          provide: getRepositoryToken(Comment),
          useValue: mockCommentRepository,
        },
        {
          provide: getRepositoryToken(Like),
          useValue: mockLikeRepository,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);

    // Reset all mocks
    jest.clearAllMocks();
    mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    mockPostRepository.createQueryBuilder.mockReturnValue(mockPostQueryBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsers', () => {
    it('전체 사용자 목록을 페이지네이션하여 반환해야 한다', async () => {
      mockQueryBuilder.getCount.mockResolvedValue(3);
      mockQueryBuilder.getMany.mockResolvedValue(mockUsers);

      const result = await service.getUsers(1, 10, 'all');

      expect(result.users).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('정지된 사용자만 필터링하여 반환해야 한다', async () => {
      const suspendedUsers = mockUsers.filter(u => u.isSuspended);
      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue(suspendedUsers);

      const result = await service.getUsers(1, 10, 'suspended');

      expect(result.users).toHaveLength(1);
      expect(result.users[0].isSuspended).toBe(true);
    });

    it('정상 사용자만 필터링하여 반환해야 한다', async () => {
      const activeUsers = mockUsers.filter(u => !u.isSuspended);
      mockQueryBuilder.getCount.mockResolvedValue(2);
      mockQueryBuilder.getMany.mockResolvedValue(activeUsers);

      const result = await service.getUsers(1, 10, 'active');

      expect(result.users).toHaveLength(2);
      result.users.forEach(user => {
        expect(user.isSuspended).toBe(false);
      });
    });
  });

  describe('suspendUser', () => {
    it('일반 사용자를 정지할 수 있어야 한다', async () => {
      const user = mockUsers[0]; // role: USER
      mockUserRepository.findOne.mockResolvedValue(user);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.suspendUser('user-1');

      expect(result.message).toBe('사용자가 정지되었습니다.');
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', { isSuspended: true });
    });

    it('관리자 계정은 정지할 수 없어야 한다', async () => {
      const admin = mockUsers[2]; // role: ADMIN
      mockUserRepository.findOne.mockResolvedValue(admin);

      await expect(service.suspendUser('admin-1')).rejects.toThrow(ForbiddenException);
      await expect(service.suspendUser('admin-1')).rejects.toThrow('관리자 계정은 정지할 수 없습니다.');
    });

    it('존재하지 않는 사용자 정지 시 에러를 던져야 한다', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.suspendUser('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.suspendUser('non-existent')).rejects.toThrow('사용자를 찾을 수 없습니다.');
    });
  });

  describe('unsuspendUser', () => {
    it('정지된 사용자의 정지를 해제할 수 있어야 한다', async () => {
      const suspendedUser = mockUsers[1]; // isSuspended: true
      mockUserRepository.findOne.mockResolvedValue(suspendedUser);
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.unsuspendUser('user-2');

      expect(result.message).toBe('사용자 정지가 해제되었습니다.');
      expect(mockUserRepository.update).toHaveBeenCalledWith('user-2', { isSuspended: false });
    });

    it('존재하지 않는 사용자 정지 해제 시 에러를 던져야 한다', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.unsuspendUser('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.unsuspendUser('non-existent')).rejects.toThrow('사용자를 찾을 수 없습니다.');
    });
  });

  describe('getPosts', () => {
    it('전체 게시물 목록을 페이지네이션하여 반환해야 한다', async () => {
      mockPostQueryBuilder.getCount.mockResolvedValue(2);
      mockPostQueryBuilder.getMany.mockResolvedValue(mockPosts);
      mockReportRepository.find.mockResolvedValue([]);

      const result = await service.getPosts(1, 10, 'all');

      expect(result.posts).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('신고된 게시물만 필터링하여 반환해야 한다', async () => {
      const reportedPost = mockPosts[0];
      mockPostQueryBuilder.getCount.mockResolvedValue(1);
      mockPostQueryBuilder.getMany.mockResolvedValue([reportedPost]);
      mockReportRepository.find.mockResolvedValue(mockReports);

      const result = await service.getPosts(1, 10, 'reported');

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].id).toBe('post-1');
    });

    it('각 게시물에 신고 정보가 포함되어야 한다', async () => {
      mockPostQueryBuilder.getCount.mockResolvedValue(1);
      mockPostQueryBuilder.getMany.mockResolvedValue([mockPosts[0]]);
      mockReportRepository.find.mockResolvedValue(mockReports);

      const result = await service.getPosts(1, 10, 'all');

      expect(result.posts[0].reportCount).toBe(1);
      expect(result.posts[0].reports).toHaveLength(1);
      expect(result.posts[0].reports[0].reason).toBe(ReportReason.SPAM);
    });

    it('삭제된 게시물만 필터링하여 반환해야 한다', async () => {
      const deletedPost = { ...mockPosts[0], isDeleted: true };
      mockPostQueryBuilder.getCount.mockResolvedValue(1);
      mockPostQueryBuilder.getMany.mockResolvedValue([deletedPost]);
      mockReportRepository.find.mockResolvedValue([]);

      const result = await service.getPosts(1, 10, 'deleted');

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].isDeleted).toBe(true);
      expect(mockPostQueryBuilder.where).toHaveBeenCalledWith(
        'post.isDeleted = :isDeleted',
        { isDeleted: true },
      );
    });
  });

  describe('deletePost', () => {
    it('게시물을 soft delete 해야 한다 (isDeleted = true)', async () => {
      mockPostRepository.findOne.mockResolvedValue(mockPosts[0]);
      mockPostRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.deletePost('post-1');

      expect(result.message).toBe('게시물이 삭제되었습니다.');
      expect(mockPostRepository.update).toHaveBeenCalledWith('post-1', { isDeleted: true });
    });

    it('존재하지 않는 게시물 삭제 시 NotFoundException을 던져야 한다', async () => {
      mockPostRepository.findOne.mockResolvedValue(null);

      await expect(service.deletePost('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.deletePost('non-existent')).rejects.toThrow('게시물을 찾을 수 없습니다.');
    });

    it('이미 삭제된 게시물 삭제 시 BadRequestException을 던져야 한다', async () => {
      const deletedPost = { ...mockPosts[0], isDeleted: true };
      mockPostRepository.findOne.mockResolvedValue(deletedPost);

      await expect(service.deletePost('post-1')).rejects.toThrow(BadRequestException);
      await expect(service.deletePost('post-1')).rejects.toThrow('이미 삭제된 게시물입니다.');
    });
  });

  describe('dismissReports', () => {
    it('게시물의 신고를 해제해야 한다', async () => {
      mockPostRepository.findOne.mockResolvedValue(mockPosts[0]);
      mockReportRepository.delete.mockResolvedValue({ affected: 2 });

      const result = await service.dismissReports('post-1');

      expect(result.message).toBe('신고가 해제되었습니다.');
      expect(mockReportRepository.delete).toHaveBeenCalledWith({ postId: 'post-1' });
    });

    it('존재하지 않는 게시물의 신고 해제 시 NotFoundException을 던져야 한다', async () => {
      mockPostRepository.findOne.mockResolvedValue(null);

      await expect(service.dismissReports('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('신고 내역이 없는 게시물의 신고 해제 시 BadRequestException을 던져야 한다', async () => {
      mockPostRepository.findOne.mockResolvedValue(mockPosts[0]);
      mockReportRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.dismissReports('post-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('restorePost', () => {
    it('삭제된 게시물을 복원해야 한다', async () => {
      const deletedPost = { ...mockPosts[0], isDeleted: true };
      mockPostRepository.findOne.mockResolvedValue(deletedPost);
      mockPostRepository.update.mockResolvedValue({ affected: 1 });

      const result = await service.restorePost('post-1');

      expect(result.message).toBe('게시물이 복원되었습니다.');
      expect(mockPostRepository.update).toHaveBeenCalledWith('post-1', { isDeleted: false });
    });

    it('존재하지 않는 게시물 복원 시 NotFoundException을 던져야 한다', async () => {
      mockPostRepository.findOne.mockResolvedValue(null);

      await expect(service.restorePost('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.restorePost('non-existent')).rejects.toThrow('게시물을 찾을 수 없습니다.');
    });

    it('삭제되지 않은 게시물 복원 시 BadRequestException을 던져야 한다', async () => {
      mockPostRepository.findOne.mockResolvedValue(mockPosts[0]); // isDeleted: false

      await expect(service.restorePost('post-1')).rejects.toThrow(BadRequestException);
      await expect(service.restorePost('post-1')).rejects.toThrow('삭제되지 않은 게시물입니다.');
    });

    it('신고 내역이 있는 게시물도 복원 가능해야 한다', async () => {
      const deletedPostWithReports = { ...mockPosts[0], isDeleted: true };
      mockPostRepository.findOne.mockResolvedValue(deletedPostWithReports);
      mockPostRepository.update.mockResolvedValue({ affected: 1 });
      // 신고 내역이 있어도 복원 가능 - 신고 내역은 유지됨
      mockReportRepository.find.mockResolvedValue(mockReports);

      const result = await service.restorePost('post-1');

      expect(result.message).toBe('게시물이 복원되었습니다.');
      expect(mockPostRepository.update).toHaveBeenCalledWith('post-1', { isDeleted: false });
      // 신고 삭제 호출이 없어야 함
      expect(mockReportRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getDashboard', () => {
    const mockDashboardQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      getRawOne: jest.fn(),
    };

    beforeEach(() => {
      // Reset dashboard-specific mocks
      mockUserRepository.createQueryBuilder.mockReturnValue(mockDashboardQueryBuilder);
      mockPostRepository.createQueryBuilder.mockReturnValue(mockDashboardQueryBuilder);
      mockCommentRepository.createQueryBuilder.mockReturnValue(mockDashboardQueryBuilder);
      mockLikeRepository.createQueryBuilder.mockReturnValue(mockDashboardQueryBuilder);
      // Reset manager.query mock
      mockManager.query.mockReset();
    });

    it('대시보드 데이터를 올바른 구조로 반환해야 한다', async () => {
      // Mock summary data (4 getRawOne calls for basic stats)
      mockDashboardQueryBuilder.getRawOne
        .mockResolvedValueOnce({ count: '10' }) // totalUsers
        .mockResolvedValueOnce({ count: '3' })  // newUsers
        .mockResolvedValueOnce({ count: '50' }) // totalPosts
        .mockResolvedValueOnce({ count: '5' })  // newPosts
        .mockResolvedValueOnce({ count: '8' }); // activeUsers (login-based)

      // Mock manager.query for retention calculation
      mockManager.query.mockResolvedValueOnce([{ count: '4' }]); // retainedUsers

      // Mock daily data
      mockDashboardQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { date: '2025-01-20', count: '1' },
          { date: '2025-01-21', count: '2' },
        ]) // daily new users
        .mockResolvedValueOnce([
          { date: '2025-01-20', count: '3' },
          { date: '2025-01-21', count: '2' },
        ]) // daily new posts
        .mockResolvedValueOnce([
          { date: '2025-01-20', count: '5' },
          { date: '2025-01-21', count: '6' },
        ]); // daily DAU

      const result = await service.getDashboard('2025-01-20', '2025-01-21', 'login');

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('dailyData');
      expect(result).toHaveProperty('meta');
      expect(result.meta.startDate).toBe('2025-01-20');
      expect(result.meta.endDate).toBe('2025-01-21');
      expect(result.meta.dauType).toBe('login');
    });

    it('요약 지표를 올바르게 계산해야 한다', async () => {
      mockDashboardQueryBuilder.getRawOne
        .mockResolvedValueOnce({ count: '100' }) // totalUsers
        .mockResolvedValueOnce({ count: '10' })  // newUsers
        .mockResolvedValueOnce({ count: '500' }) // totalPosts
        .mockResolvedValueOnce({ count: '50' })  // newPosts
        .mockResolvedValueOnce({ count: '20' }); // activeUsers (login-based)

      // Mock manager.query for retention
      mockManager.query.mockResolvedValueOnce([{ count: '8' }]); // retainedUsers (40% retention)

      mockDashboardQueryBuilder.getRawMany
        .mockResolvedValueOnce([]) // daily users
        .mockResolvedValueOnce([]) // daily posts
        .mockResolvedValueOnce([]); // daily DAU

      const result = await service.getDashboard('2025-01-01', '2025-01-07', 'login');

      expect(result.summary.totalUsers).toBe(100);
      expect(result.summary.newUsers).toBe(10);
      expect(result.summary.totalPosts).toBe(500);
      expect(result.summary.newPosts).toBe(50);
      expect(result.summary.activeUsers).toBe(20);
      expect(result.summary.retainedUsers).toBe(8);
      expect(result.summary.retentionRate).toBe(40); // 8/20 * 100 = 40%
    });

    it('활성 사용자가 0명일 때 재접속율을 0%로 반환해야 한다', async () => {
      mockDashboardQueryBuilder.getRawOne
        .mockResolvedValueOnce({ count: '10' })  // totalUsers
        .mockResolvedValueOnce({ count: '0' })   // newUsers
        .mockResolvedValueOnce({ count: '20' })  // totalPosts
        .mockResolvedValueOnce({ count: '0' })   // newPosts
        .mockResolvedValueOnce({ count: '0' });  // activeUsers (0!)

      mockManager.query.mockResolvedValueOnce([{ count: '0' }]); // retainedUsers

      mockDashboardQueryBuilder.getRawMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getDashboard('2025-01-01', '2025-01-01', 'login');

      expect(result.summary.activeUsers).toBe(0);
      expect(result.summary.retentionRate).toBe(0);
    });

    it('일별 데이터를 기간 내 각 날짜별로 반환해야 한다', async () => {
      mockDashboardQueryBuilder.getRawOne
        .mockResolvedValueOnce({ count: '10' })
        .mockResolvedValueOnce({ count: '3' })
        .mockResolvedValueOnce({ count: '50' })
        .mockResolvedValueOnce({ count: '5' })
        .mockResolvedValueOnce({ count: '8' });

      mockManager.query.mockResolvedValueOnce([{ count: '4' }]); // retainedUsers

      mockDashboardQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { date: '2025-01-01', count: '2' },
          { date: '2025-01-02', count: '1' },
          { date: '2025-01-03', count: '0' },
        ])
        .mockResolvedValueOnce([
          { date: '2025-01-01', count: '5' },
          { date: '2025-01-02', count: '3' },
        ])
        .mockResolvedValueOnce([
          { date: '2025-01-01', count: '10' },
          { date: '2025-01-02', count: '8' },
          { date: '2025-01-03', count: '12' },
        ]);

      const result = await service.getDashboard('2025-01-01', '2025-01-03', 'login');

      expect(result.dailyData).toHaveLength(3);
      expect(result.dailyData[0].date).toBe('2025-01-01');
      expect(result.dailyData[1].date).toBe('2025-01-02');
      expect(result.dailyData[2].date).toBe('2025-01-03');
    });

    it('활동 기준 DAU를 올바르게 계산해야 한다', async () => {
      mockDashboardQueryBuilder.getRawOne
        .mockResolvedValueOnce({ count: '10' })
        .mockResolvedValueOnce({ count: '3' })
        .mockResolvedValueOnce({ count: '50' })
        .mockResolvedValueOnce({ count: '5' });

      // For activity-based DAU, both activeUsers and retainedUsers use manager.query
      mockManager.query
        .mockResolvedValueOnce([{ count: '15' }])  // activeUsers (activity-based)
        .mockResolvedValueOnce([{ count: '6' }])   // retainedUsers
        .mockResolvedValueOnce([{ date: '2025-01-01', count: '15' }]); // daily DAU (activity)

      mockDashboardQueryBuilder.getRawMany
        .mockResolvedValueOnce([])   // daily new users
        .mockResolvedValueOnce([]);  // daily new posts

      const result = await service.getDashboard('2025-01-01', '2025-01-01', 'activity');

      expect(result.meta.dauType).toBe('activity');
      expect(result.summary.activeUsers).toBe(15);
      expect(result.summary.retentionRate).toBe(40); // 6/15 * 100 = 40%
    });

    it('누적 데이터를 올바르게 계산해야 한다', async () => {
      // Base counts before period start
      mockDashboardQueryBuilder.getRawOne
        .mockResolvedValueOnce({ count: '100' }) // totalUsers at endDate
        .mockResolvedValueOnce({ count: '5' })   // newUsers in period
        .mockResolvedValueOnce({ count: '200' }) // totalPosts at endDate
        .mockResolvedValueOnce({ count: '10' })  // newPosts in period
        .mockResolvedValueOnce({ count: '10' }); // activeUsers (login-based)

      mockManager.query.mockResolvedValueOnce([{ count: '3' }]); // retainedUsers

      // Before period: 95 users, 190 posts
      mockDashboardQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { date: '2025-01-01', count: '2' },
          { date: '2025-01-02', count: '3' },
        ])
        .mockResolvedValueOnce([
          { date: '2025-01-01', count: '5' },
          { date: '2025-01-02', count: '5' },
        ])
        .mockResolvedValueOnce([
          { date: '2025-01-01', count: '8' },
          { date: '2025-01-02', count: '10' },
        ]);

      const result = await service.getDashboard('2025-01-01', '2025-01-02', 'login');

      // First day: base (100-5=95) + 2 = 97
      // Second day: 97 + 3 = 100
      expect(result.dailyData[0].cumulativeUsers).toBe(97);
      expect(result.dailyData[1].cumulativeUsers).toBe(100);
    });
  });
});
