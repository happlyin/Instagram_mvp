import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { User } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { FollowsService } from '../follows/follows.service';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage/storage.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let userRepository: jest.Mocked<Repository<User>>;
  let postRepository: jest.Mocked<Repository<Post>>;
  let followsService: jest.Mocked<FollowsService>;
  let storageService: jest.Mocked<StorageService>;

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@test.com',
    profileImageUrl: null,
  } as User;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Post),
          useValue: {
            count: jest.fn(),
          },
        },
        {
          provide: FollowsService,
          useValue: {
            getFollowerCount: jest.fn(),
            getFollowingCount: jest.fn(),
            getFollowStatus: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:4000/uploads/images'),
          },
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    userRepository = module.get(getRepositoryToken(User));
    postRepository = module.get(getRepositoryToken(Post));
    followsService = module.get(FollowsService);
    storageService = module.get(StorageService);
  });

  describe('getProfile', () => {
    it('should return profile with counts and follow status', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      postRepository.count.mockResolvedValue(5);
      followsService.getFollowerCount.mockResolvedValue(10);
      followsService.getFollowingCount.mockResolvedValue(3);
      followsService.getFollowStatus.mockResolvedValue({
        isFollowedByMe: true,
        isFollowingMe: false,
      });

      const result = await service.getProfile('testuser', 'current-user-id');

      expect(result.id).toBe('user-1');
      expect(result.username).toBe('testuser');
      expect(result.postCount).toBe(5);
      expect(result.followerCount).toBe(10);
      expect(result.followingCount).toBe(3);
      expect(result.isFollowedByMe).toBe(true);
      expect(result.isFollowingMe).toBe(false);
    });

    it('should return profile without follow status when viewing own profile', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      postRepository.count.mockResolvedValue(5);
      followsService.getFollowerCount.mockResolvedValue(10);
      followsService.getFollowingCount.mockResolvedValue(3);

      const result = await service.getProfile('testuser', 'user-1');

      expect(result.isFollowedByMe).toBe(false);
      expect(result.isFollowingMe).toBe(false);
      expect(followsService.getFollowStatus).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getProfile('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfileImage', () => {
    it('should upload new image and update user', async () => {
      const userWithNoImage = { ...mockUser, profileImageUrl: null } as User;
      userRepository.findOne.mockResolvedValue(userWithNoImage);
      storageService.uploadFile.mockResolvedValue({
        url: 'http://localhost:4000/uploads/images/user-1/profile.jpg',
        key: 'user-1/profile.jpg',
        originalFileName: 'photo.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
      });
      userRepository.save.mockResolvedValue({
        ...userWithNoImage,
        profileImageUrl: 'http://localhost:4000/uploads/images/user-1/profile.jpg',
      } as User);

      const file = {
        fieldname: 'image',
        originalname: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('image'),
        size: 1024,
      };

      const result = await service.updateProfileImage('user-1', file);

      expect(result.profileImageUrl).toBe(
        'http://localhost:4000/uploads/images/user-1/profile.jpg',
      );
      expect(storageService.uploadFile).toHaveBeenCalledWith(file, 'user-1');
      expect(storageService.deleteFile).not.toHaveBeenCalled();
    });

    it('should delete old image when updating', async () => {
      const userWithImage = {
        ...mockUser,
        profileImageUrl: 'http://localhost:4000/uploads/images/user-1/old.jpg',
      } as User;
      userRepository.findOne.mockResolvedValue(userWithImage);
      storageService.uploadFile.mockResolvedValue({
        url: 'http://localhost:4000/uploads/images/user-1/new.jpg',
        key: 'user-1/new.jpg',
        originalFileName: 'new.jpg',
        mimeType: 'image/jpeg',
        fileSize: 2048,
      });
      userRepository.save.mockResolvedValue({
        ...userWithImage,
        profileImageUrl: 'http://localhost:4000/uploads/images/user-1/new.jpg',
      } as User);

      const file = {
        fieldname: 'image',
        originalname: 'new.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('newimage'),
        size: 2048,
      };

      const result = await service.updateProfileImage('user-1', file);

      expect(result.profileImageUrl).toBe(
        'http://localhost:4000/uploads/images/user-1/new.jpg',
      );
      expect(storageService.deleteFile).toHaveBeenCalledWith(
        'user-1/old.jpg',
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const file = {
        fieldname: 'image',
        originalname: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('image'),
        size: 1024,
      };

      await expect(
        service.updateProfileImage('nonexistent', file),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
