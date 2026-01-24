import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';

describe('CommentsService', () => {
  let service: CommentsService;

  const mockCommentsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: getRepositoryToken(Comment),
          useValue: mockCommentsRepository,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createComment', () => {
    it('댓글을 생성하고 작성자 정보와 함께 반환해야 한다', async () => {
      const mockComment = {
        id: 'comment-1',
        userId: 'user-1',
        postId: 'post-1',
        text: '좋은 사진이네요!',
        createdAt: new Date('2025-01-22T10:00:00Z'),
        user: { id: 'user-1', username: 'testuser' },
      };

      mockCommentsRepository.create.mockReturnValue(mockComment);
      mockCommentsRepository.save.mockResolvedValue(mockComment);
      mockCommentsRepository.findOne.mockResolvedValue(mockComment);

      const result = await service.createComment('user-1', 'post-1', '좋은 사진이네요!');

      expect(mockCommentsRepository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        postId: 'post-1',
        text: '좋은 사진이네요!',
      });
      expect(result).toEqual({
        id: 'comment-1',
        text: '좋은 사진이네요!',
        author: { id: 'user-1', username: 'testuser', profileImageUrl: null },
        createdAt: mockComment.createdAt,
      });
    });
  });

  describe('deleteComment', () => {
    it('본인 댓글을 삭제할 수 있어야 한다', async () => {
      const mockComment = {
        id: 'comment-1',
        userId: 'user-1',
        postId: 'post-1',
        text: '댓글 내용',
      };

      mockCommentsRepository.findOne.mockResolvedValue(mockComment);
      mockCommentsRepository.delete.mockResolvedValue({ affected: 1 });

      await service.deleteComment('user-1', 'comment-1');

      expect(mockCommentsRepository.delete).toHaveBeenCalledWith({ id: 'comment-1' });
    });

    it('다른 유저의 댓글을 삭제하면 ForbiddenException을 던져야 한다', async () => {
      const mockComment = {
        id: 'comment-1',
        userId: 'user-2',
        postId: 'post-1',
        text: '다른 유저의 댓글',
      };

      mockCommentsRepository.findOne.mockResolvedValue(mockComment);

      await expect(
        service.deleteComment('user-1', 'comment-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('존재하지 않는 댓글을 삭제하면 에러를 던져야 한다', async () => {
      mockCommentsRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteComment('user-1', 'nonexistent'),
      ).rejects.toThrow();
    });
  });

  describe('findComments', () => {
    it('최신순으로 댓글을 페이지네이션하여 반환해야 한다', async () => {
      const mockComments = [
        {
          id: 'comment-3',
          text: '세번째',
          createdAt: new Date('2025-01-22T12:00:00Z'),
          user: { id: 'user-1', username: 'user1' },
        },
        {
          id: 'comment-2',
          text: '두번째',
          createdAt: new Date('2025-01-22T11:00:00Z'),
          user: { id: 'user-2', username: 'user2' },
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockComments),
      };

      mockCommentsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findComments('post-1', 20);

      expect(result.comments).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.comments[0].text).toBe('세번째');
    });

    it('limit+1개 조회 시 hasMore가 true여야 한다', async () => {
      const mockComments = Array.from({ length: 21 }, (_, i) => ({
        id: `comment-${i}`,
        text: `댓글 ${i}`,
        createdAt: new Date(Date.now() - i * 60000),
        user: { id: 'user-1', username: 'user1' },
      }));

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockComments),
      };

      mockCommentsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findComments('post-1', 20);

      expect(result.comments).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });

    it('cursor가 있으면 해당 시간 이전 댓글만 조회해야 한다', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockCommentsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.findComments('post-1', 20, '2025-01-22T10:00:00Z');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'comment.createdAt < :cursor',
        { cursor: expect.any(Date) },
      );
    });
  });

  describe('getCommentCount', () => {
    it('포스트의 댓글 수를 반환해야 한다', async () => {
      mockCommentsRepository.count.mockResolvedValue(10);

      const result = await service.getCommentCount('post-1');

      expect(result).toBe(10);
    });
  });

  describe('getCommentCounts', () => {
    it('여러 포스트의 댓글 수를 배치로 반환해야 한다', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { postId: 'post-1', count: '5' },
          { postId: 'post-2', count: '3' },
        ]),
      };

      mockCommentsRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getCommentCounts(['post-1', 'post-2', 'post-3']);

      expect(result.get('post-1')).toBe(5);
      expect(result.get('post-2')).toBe(3);
      expect(result.get('post-3')).toBe(0);
    });
  });
});
