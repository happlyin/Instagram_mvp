import { Test, TestingModule } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

describe('ProfileController', () => {
  let controller: ProfileController;
  let profileService: jest.Mocked<ProfileService>;

  const mockUser = {
    userId: 'user-1',
    email: 'user1@test.com',
    username: 'user1',
  };

  const mockReq = { user: mockUser } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: ProfileService,
          useValue: {
            getProfile: jest.fn(),
            updateProfileImage: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ProfileController>(ProfileController);
    profileService = module.get(ProfileService);
  });

  describe('getProfile', () => {
    it('should return profile data', async () => {
      const mockProfile = {
        id: 'user-2',
        username: 'user2',
        profileImageUrl: null,
        postCount: 5,
        followerCount: 10,
        followingCount: 3,
        isFollowedByMe: true,
        isFollowingMe: false,
      };

      profileService.getProfile.mockResolvedValue(mockProfile);

      const result = await controller.getProfile(mockReq, 'user2');

      expect(result).toEqual(mockProfile);
      expect(profileService.getProfile).toHaveBeenCalledWith('user2', 'user-1');
    });
  });

  describe('updateProfileImage', () => {
    it('should update profile image', async () => {
      const mockFile = {
        fieldname: 'image',
        originalname: 'photo.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        buffer: Buffer.from('image'),
        size: 1024,
      };

      profileService.updateProfileImage.mockResolvedValue({
        profileImageUrl: 'http://localhost:4000/uploads/images/user-1/profile.jpg',
      });

      const result = await controller.updateProfileImage(mockReq, mockFile as any);

      expect(result.profileImageUrl).toBe(
        'http://localhost:4000/uploads/images/user-1/profile.jpg',
      );
      expect(profileService.updateProfileImage).toHaveBeenCalledWith(
        'user-1',
        mockFile,
      );
    });
  });
});
