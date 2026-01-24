import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FollowsService } from './follows.service';
import { Follow } from './entities/follow.entity';
import { BadRequestException } from '@nestjs/common';
import { User } from '../users/entities/user.entity';

describe('FollowsService', () => {
  let service: FollowsService;
  let followRepository: jest.Mocked<Repository<Follow>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowsService,
        {
          provide: getRepositoryToken(Follow),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FollowsService>(FollowsService);
    followRepository = module.get(getRepositoryToken(Follow));
  });

  describe('toggleFollow', () => {
    it('should follow a user when not already following', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';

      followRepository.findOne.mockResolvedValue(null);
      followRepository.create.mockReturnValue({
        id: 'follow-1',
        followerId,
        followingId,
        createdAt: new Date(),
      } as Follow);
      followRepository.save.mockResolvedValue({
        id: 'follow-1',
        followerId,
        followingId,
        createdAt: new Date(),
      } as Follow);
      followRepository.count.mockResolvedValue(1);

      const result = await service.toggleFollow(followerId, followingId);

      expect(result.followed).toBe(true);
      expect(result.followerCount).toBe(1);
      expect(followRepository.create).toHaveBeenCalledWith({
        followerId,
        followingId,
      });
      expect(followRepository.save).toHaveBeenCalled();
    });

    it('should unfollow a user when already following', async () => {
      const followerId = 'user-1';
      const followingId = 'user-2';
      const existingFollow = {
        id: 'follow-1',
        followerId,
        followingId,
        createdAt: new Date(),
      } as Follow;

      followRepository.findOne.mockResolvedValue(existingFollow);
      followRepository.delete.mockResolvedValue({ affected: 1, raw: {} });
      followRepository.count.mockResolvedValue(0);

      const result = await service.toggleFollow(followerId, followingId);

      expect(result.followed).toBe(false);
      expect(result.followerCount).toBe(0);
      expect(followRepository.delete).toHaveBeenCalledWith({ id: 'follow-1' });
    });

    it('should throw error when trying to follow yourself', async () => {
      await expect(
        service.toggleFollow('user-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getFollowerCount', () => {
    it('should return the number of followers', async () => {
      followRepository.count.mockResolvedValue(5);

      const result = await service.getFollowerCount('user-1');

      expect(result).toBe(5);
      expect(followRepository.count).toHaveBeenCalledWith({
        where: { followingId: 'user-1' },
      });
    });
  });

  describe('getFollowingCount', () => {
    it('should return the number of users being followed', async () => {
      followRepository.count.mockResolvedValue(3);

      const result = await service.getFollowingCount('user-1');

      expect(result).toBe(3);
      expect(followRepository.count).toHaveBeenCalledWith({
        where: { followerId: 'user-1' },
      });
    });
  });

  describe('isFollowing', () => {
    it('should return true when following', async () => {
      followRepository.findOne.mockResolvedValue({
        id: 'follow-1',
        followerId: 'user-1',
        followingId: 'user-2',
        createdAt: new Date(),
      } as Follow);

      const result = await service.isFollowing('user-1', 'user-2');

      expect(result).toBe(true);
    });

    it('should return false when not following', async () => {
      followRepository.findOne.mockResolvedValue(null);

      const result = await service.isFollowing('user-1', 'user-2');

      expect(result).toBe(false);
    });
  });

  describe('getFollowStatus', () => {
    it('should return both follow directions', async () => {
      // user-1 follows user-2, user-2 does not follow user-1
      followRepository.findOne
        .mockResolvedValueOnce({ id: 'f1' } as Follow) // isFollowedByMe
        .mockResolvedValueOnce(null); // isFollowingMe

      const result = await service.getFollowStatus('user-1', 'user-2');

      expect(result.isFollowedByMe).toBe(true);
      expect(result.isFollowingMe).toBe(false);
    });

    it('should return mutual follow status', async () => {
      followRepository.findOne
        .mockResolvedValueOnce({ id: 'f1' } as Follow) // isFollowedByMe
        .mockResolvedValueOnce({ id: 'f2' } as Follow); // isFollowingMe

      const result = await service.getFollowStatus('user-1', 'user-2');

      expect(result.isFollowedByMe).toBe(true);
      expect(result.isFollowingMe).toBe(true);
    });
  });

  describe('getFollowStatusBatch', () => {
    it('should return empty map for empty userIds', async () => {
      const result = await service.getFollowStatusBatch('current-user', []);
      expect(result.size).toBe(0);
    });

    it('should return correct follow status for multiple users', async () => {
      const currentUserId = 'current-user';
      const userIds = ['user-1', 'user-2', 'user-3'];

      // current-user follows user-1 and user-2
      followRepository.find
        .mockResolvedValueOnce([
          { followingId: 'user-1' } as Follow,
          { followingId: 'user-2' } as Follow,
        ])
        // user-2 and user-3 follow current-user
        .mockResolvedValueOnce([
          { followerId: 'user-2' } as Follow,
          { followerId: 'user-3' } as Follow,
        ]);

      const result = await service.getFollowStatusBatch(currentUserId, userIds);

      expect(result.get('user-1')).toEqual({ isFollowedByMe: true, isFollowingMe: false });
      expect(result.get('user-2')).toEqual({ isFollowedByMe: true, isFollowingMe: true });
      expect(result.get('user-3')).toEqual({ isFollowedByMe: false, isFollowingMe: true });
    });

    it('should handle case where no relationships exist', async () => {
      followRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getFollowStatusBatch('current-user', ['user-1']);
      expect(result.get('user-1')).toEqual({ isFollowedByMe: false, isFollowingMe: false });
    });
  });

  describe('getFollowers', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };
      followRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should return followers with user info and follow status', async () => {
      const userId = 'target-user';
      const currentUserId = 'current-user';
      const now = new Date('2025-01-20T10:00:00Z');

      mockQueryBuilder.getMany.mockResolvedValue([
        {
          id: 'follow-1',
          followerId: 'user-1',
          followingId: userId,
          createdAt: now,
          follower: { id: 'user-1', username: 'alice', profileImageUrl: 'img1.jpg' } as User,
        },
      ]);

      followRepository.find
        .mockResolvedValueOnce([]) // isFollowedByMe
        .mockResolvedValueOnce([{ followerId: 'user-1' } as Follow]); // isFollowingMe

      const result = await service.getFollowers(userId, currentUserId, 20);

      expect(result.users).toHaveLength(1);
      expect(result.users[0].id).toBe('user-1');
      expect(result.users[0].username).toBe('alice');
      expect(result.users[0].profileImageUrl).toBe('img1.jpg');
      expect(result.users[0].followedAt).toBe(now.toISOString());
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should return empty list when user has no followers', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.getFollowers('user-1', 'current-user', 20);

      expect(result.users).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should paginate correctly with hasMore=true', async () => {
      const now = new Date('2025-01-20T10:00:00Z');
      const earlier = new Date('2025-01-19T10:00:00Z');

      // Returns 3 items when limit is 2 (limit+1 pattern)
      mockQueryBuilder.getMany.mockResolvedValue([
        {
          id: 'f1', followerId: 'u1', followingId: 'target', createdAt: now,
          follower: { id: 'u1', username: 'a', profileImageUrl: null } as User,
        },
        {
          id: 'f2', followerId: 'u2', followingId: 'target', createdAt: earlier,
          follower: { id: 'u2', username: 'b', profileImageUrl: null } as User,
        },
        {
          id: 'f3', followerId: 'u3', followingId: 'target', createdAt: new Date('2025-01-18T10:00:00Z'),
          follower: { id: 'u3', username: 'c', profileImageUrl: null } as User,
        },
      ]);

      followRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getFollowers('target', 'current', 2);

      expect(result.users).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe(earlier.toISOString());
    });

    it('should apply cursor when provided', async () => {
      const cursor = '2025-01-20T10:00:00.000Z';
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getFollowers('target', 'current', 20, cursor);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'follow.createdAt < :cursor',
        { cursor: new Date(cursor) },
      );
    });

    it('should order by createdAt DESC', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getFollowers('target', 'current', 20);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('follow.createdAt', 'DESC');
    });
  });

  describe('getFollowing', () => {
    let mockQueryBuilder: any;

    beforeEach(() => {
      mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };
      followRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
    });

    it('should return following list with user info and follow status', async () => {
      const userId = 'target-user';
      const currentUserId = 'current-user';
      const now = new Date('2025-01-20T10:00:00Z');

      mockQueryBuilder.getMany.mockResolvedValue([
        {
          id: 'follow-1',
          followerId: userId,
          followingId: 'user-1',
          createdAt: now,
          following: { id: 'user-1', username: 'bob', profileImageUrl: null } as User,
        },
      ]);

      followRepository.find
        .mockResolvedValueOnce([{ followingId: 'user-1' } as Follow]) // current follows user-1
        .mockResolvedValueOnce([]); // user-1 doesn't follow current

      const result = await service.getFollowing(userId, currentUserId, 20);

      expect(result.users).toHaveLength(1);
      expect(result.users[0].id).toBe('user-1');
      expect(result.users[0].username).toBe('bob');
      expect(result.users[0].profileImageUrl).toBeNull();
      expect(result.users[0].followStatus.isFollowedByMe).toBe(true);
      expect(result.users[0].followStatus.isFollowingMe).toBe(false);
      expect(result.hasMore).toBe(false);
    });

    it('should return empty list when user follows nobody', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.getFollowing('user-1', 'current-user', 20);

      expect(result.users).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('should paginate correctly with hasMore=true', async () => {
      const now = new Date('2025-01-20T10:00:00Z');
      const earlier = new Date('2025-01-19T10:00:00Z');

      mockQueryBuilder.getMany.mockResolvedValue([
        {
          id: 'f1', followerId: 'target', followingId: 'u1', createdAt: now,
          following: { id: 'u1', username: 'a', profileImageUrl: null } as User,
        },
        {
          id: 'f2', followerId: 'target', followingId: 'u2', createdAt: earlier,
          following: { id: 'u2', username: 'b', profileImageUrl: null } as User,
        },
        {
          id: 'f3', followerId: 'target', followingId: 'u3', createdAt: new Date('2025-01-18T10:00:00Z'),
          following: { id: 'u3', username: 'c', profileImageUrl: null } as User,
        },
      ]);

      followRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getFollowing('target', 'current', 2);

      expect(result.users).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe(earlier.toISOString());
    });

    it('should apply cursor and order by createdAt DESC', async () => {
      const cursor = '2025-01-20T10:00:00.000Z';
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.getFollowing('target', 'current', 20, cursor);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'follow.createdAt < :cursor',
        { cursor: new Date(cursor) },
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('follow.createdAt', 'DESC');
    });
  });
});
