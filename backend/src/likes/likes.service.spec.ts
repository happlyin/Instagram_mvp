import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LikesService } from './likes.service';
import { Like } from './entities/like.entity';

describe('LikesService', () => {
  let service: LikesService;
  let likesRepository: jest.Mocked<Repository<Like>>;

  const mockLikesRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LikesService,
        {
          provide: getRepositoryToken(Like),
          useValue: mockLikesRepository,
        },
      ],
    }).compile();

    service = module.get<LikesService>(LikesService);
    likesRepository = module.get(getRepositoryToken(Like));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('toggleLike', () => {
    const userId = 'user-1';
    const postId = 'post-1';

    it('좋아요가 없을 때 추가하고 liked: true를 반환해야 한다', async () => {
      mockLikesRepository.findOne.mockResolvedValue(null);
      mockLikesRepository.create.mockReturnValue({ userId, postId } as Like);
      mockLikesRepository.save.mockResolvedValue({ id: 'like-1', userId, postId } as Like);
      mockLikesRepository.count.mockResolvedValue(1);

      const result = await service.toggleLike(userId, postId);

      expect(mockLikesRepository.findOne).toHaveBeenCalledWith({
        where: { userId, postId },
      });
      expect(mockLikesRepository.create).toHaveBeenCalledWith({ userId, postId });
      expect(mockLikesRepository.save).toHaveBeenCalled();
      expect(result).toEqual({ liked: true, likeCount: 1 });
    });

    it('좋아요가 있을 때 삭제하고 liked: false를 반환해야 한다', async () => {
      const existingLike = { id: 'like-1', userId, postId } as Like;
      mockLikesRepository.findOne.mockResolvedValue(existingLike);
      mockLikesRepository.delete.mockResolvedValue({ affected: 1, raw: [] });
      mockLikesRepository.count.mockResolvedValue(0);

      const result = await service.toggleLike(userId, postId);

      expect(mockLikesRepository.findOne).toHaveBeenCalledWith({
        where: { userId, postId },
      });
      expect(mockLikesRepository.delete).toHaveBeenCalledWith({ id: 'like-1' });
      expect(result).toEqual({ liked: false, likeCount: 0 });
    });
  });

  describe('getLikeCount', () => {
    it('해당 포스트의 좋아요 수를 반환해야 한다', async () => {
      mockLikesRepository.count.mockResolvedValue(5);

      const result = await service.getLikeCount('post-1');

      expect(mockLikesRepository.count).toHaveBeenCalledWith({
        where: { postId: 'post-1' },
      });
      expect(result).toBe(5);
    });
  });

  describe('isLikedByUser', () => {
    it('좋아요를 눌렀으면 true를 반환해야 한다', async () => {
      mockLikesRepository.findOne.mockResolvedValue({ id: 'like-1' } as Like);

      const result = await service.isLikedByUser('user-1', 'post-1');

      expect(result).toBe(true);
    });

    it('좋아요를 누르지 않았으면 false를 반환해야 한다', async () => {
      mockLikesRepository.findOne.mockResolvedValue(null);

      const result = await service.isLikedByUser('user-1', 'post-1');

      expect(result).toBe(false);
    });
  });

  describe('getLikeInfoForPosts', () => {
    it('여러 포스트의 좋아요 정보를 배치로 반환해야 한다', async () => {
      const postIds = ['post-1', 'post-2', 'post-3'];
      const userId = 'user-1';

      // count 쿼리를 위한 createQueryBuilder mock
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { postId: 'post-1', count: '3' },
          { postId: 'post-2', count: '1' },
        ]),
      };

      (likesRepository as any).createQueryBuilder = jest.fn().mockReturnValue(mockQueryBuilder);

      // 유저의 좋아요 목록
      (likesRepository as any).find = jest.fn().mockResolvedValue([
        { postId: 'post-1' } as Like,
      ]);

      const result = await service.getLikeInfoForPosts(postIds, userId);

      expect(result.get('post-1')).toEqual({ likeCount: 3, isLikedByMe: true });
      expect(result.get('post-2')).toEqual({ likeCount: 1, isLikedByMe: false });
      expect(result.get('post-3')).toEqual({ likeCount: 0, isLikedByMe: false });
    });
  });
});
