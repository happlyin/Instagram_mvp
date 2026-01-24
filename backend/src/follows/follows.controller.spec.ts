import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { FollowsController } from './follows.controller';
import { FollowsService } from './follows.service';
import { User } from '../users/entities/user.entity';

describe('FollowsController', () => {
  let controller: FollowsController;
  let followsService: jest.Mocked<FollowsService>;
  let userRepository: any;

  const mockUser = {
    userId: 'user-1',
    email: 'user1@test.com',
    username: 'user1',
  };

  const mockReq = { user: mockUser } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FollowsController],
      providers: [
        {
          provide: FollowsService,
          useValue: {
            toggleFollow: jest.fn(),
            getFollowers: jest.fn(),
            getFollowing: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FollowsController>(FollowsController);
    followsService = module.get(FollowsService);
    userRepository = module.get(getRepositoryToken(User));
  });

  describe('toggleFollow', () => {
    it('should toggle follow for a valid user', async () => {
      const targetUser = { id: 'user-2', username: 'user2' };
      userRepository.findOne.mockResolvedValue(targetUser);
      followsService.toggleFollow.mockResolvedValue({
        followed: true,
        followerCount: 1,
      });

      const result = await controller.toggleFollow(mockReq, 'user2');

      expect(result).toEqual({ followed: true, followerCount: 1 });
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'user2' },
      });
      expect(followsService.toggleFollow).toHaveBeenCalledWith('user-1', 'user-2');
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.toggleFollow(mockReq, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should unfollow when already following', async () => {
      const targetUser = { id: 'user-2', username: 'user2' };
      userRepository.findOne.mockResolvedValue(targetUser);
      followsService.toggleFollow.mockResolvedValue({
        followed: false,
        followerCount: 0,
      });

      const result = await controller.toggleFollow(mockReq, 'user2');

      expect(result).toEqual({ followed: false, followerCount: 0 });
    });
  });

  describe('getFollowers', () => {
    it('should return followers list for valid username', async () => {
      const targetUser = { id: 'user-2', username: 'user2' };
      userRepository.findOne.mockResolvedValue(targetUser);
      const mockResult = {
        users: [
          {
            id: 'user-3',
            username: 'user3',
            profileImageUrl: null,
            followStatus: { isFollowedByMe: false, isFollowingMe: false },
            followedAt: '2025-01-20T10:00:00.000Z',
          },
        ],
        hasMore: false,
        nextCursor: null,
      };
      followsService.getFollowers.mockResolvedValue(mockResult);

      const result = await controller.getFollowers(mockReq, 'user2', '20', undefined);

      expect(result).toEqual(mockResult);
      expect(followsService.getFollowers).toHaveBeenCalledWith('user-2', 'user-1', 20, undefined);
    });

    it('should throw NotFoundException for nonexistent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.getFollowers(mockReq, 'nonexistent', '20', undefined),
      ).rejects.toThrow(NotFoundException);
    });

    it('should default limit to 20', async () => {
      const targetUser = { id: 'user-2', username: 'user2' };
      userRepository.findOne.mockResolvedValue(targetUser);
      followsService.getFollowers.mockResolvedValue({ users: [], hasMore: false, nextCursor: null });

      await controller.getFollowers(mockReq, 'user2', undefined, undefined);

      expect(followsService.getFollowers).toHaveBeenCalledWith('user-2', 'user-1', 20, undefined);
    });

    it('should pass cursor to service', async () => {
      const targetUser = { id: 'user-2', username: 'user2' };
      userRepository.findOne.mockResolvedValue(targetUser);
      followsService.getFollowers.mockResolvedValue({ users: [], hasMore: false, nextCursor: null });

      const cursor = '2025-01-20T10:00:00.000Z';
      await controller.getFollowers(mockReq, 'user2', '20', cursor);

      expect(followsService.getFollowers).toHaveBeenCalledWith('user-2', 'user-1', 20, cursor);
    });
  });

  describe('getFollowing', () => {
    it('should return following list for valid username', async () => {
      const targetUser = { id: 'user-2', username: 'user2' };
      userRepository.findOne.mockResolvedValue(targetUser);
      const mockResult = {
        users: [
          {
            id: 'user-3',
            username: 'user3',
            profileImageUrl: 'img.jpg',
            followStatus: { isFollowedByMe: true, isFollowingMe: false },
            followedAt: '2025-01-20T10:00:00.000Z',
          },
        ],
        hasMore: false,
        nextCursor: null,
      };
      followsService.getFollowing.mockResolvedValue(mockResult);

      const result = await controller.getFollowing(mockReq, 'user2', '20', undefined);

      expect(result).toEqual(mockResult);
      expect(followsService.getFollowing).toHaveBeenCalledWith('user-2', 'user-1', 20, undefined);
    });

    it('should throw NotFoundException for nonexistent user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        controller.getFollowing(mockReq, 'nonexistent', '20', undefined),
      ).rejects.toThrow(NotFoundException);
    });

    it('should pass limit and cursor to service', async () => {
      const targetUser = { id: 'user-2', username: 'user2' };
      userRepository.findOne.mockResolvedValue(targetUser);
      followsService.getFollowing.mockResolvedValue({ users: [], hasMore: false, nextCursor: null });

      await controller.getFollowing(mockReq, 'user2', '10', '2025-01-20T10:00:00.000Z');

      expect(followsService.getFollowing).toHaveBeenCalledWith(
        'user-2', 'user-1', 10, '2025-01-20T10:00:00.000Z',
      );
    });
  });
});
