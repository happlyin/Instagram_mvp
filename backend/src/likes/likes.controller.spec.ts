import { Test, TestingModule } from '@nestjs/testing';
import { LikesController } from './likes.controller';
import { LikesService } from './likes.service';

describe('LikesController', () => {
  let controller: LikesController;
  let likesService: jest.Mocked<LikesService>;

  const mockLikesService = {
    toggleLike: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LikesController],
      providers: [
        {
          provide: LikesService,
          useValue: mockLikesService,
        },
      ],
    }).compile();

    controller = module.get<LikesController>(LikesController);
    likesService = module.get(LikesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /posts/:postId/like', () => {
    it('좋아요를 토글하고 결과를 반환해야 한다', async () => {
      const req = { user: { userId: 'user-1' } } as any;
      mockLikesService.toggleLike.mockResolvedValue({
        liked: true,
        likeCount: 1,
      });

      const result = await controller.toggleLike(req, 'post-1');

      expect(mockLikesService.toggleLike).toHaveBeenCalledWith('user-1', 'post-1');
      expect(result).toEqual({ liked: true, likeCount: 1 });
    });

    it('좋아요 취소를 반환해야 한다', async () => {
      const req = { user: { userId: 'user-1' } } as any;
      mockLikesService.toggleLike.mockResolvedValue({
        liked: false,
        likeCount: 0,
      });

      const result = await controller.toggleLike(req, 'post-1');

      expect(result).toEqual({ liked: false, likeCount: 0 });
    });
  });
});
