import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePostDto } from './dto/create-post.dto';

describe('PostsController', () => {
  let controller: PostsController;
  let postsService: jest.Mocked<PostsService>;

  const mockUser = {
    userId: 'user-123',
    email: 'test@test.com',
    username: 'testuser',
  };

  const mockPost = {
    id: 'post-123',
    author: { id: 'user-123', username: 'testuser' },
    images: [
      {
        id: 'img-1',
        imageUrl: 'http://localhost:4000/uploads/images/user-123/image.jpg',
        orderIndex: 0,
        originalFileName: 'photo.jpg',
        mimeType: 'image/jpeg',
      },
    ],
    captions: [
      {
        id: 'cap-1',
        text: 'Test caption',
        orderIndex: 0,
        isBold: false,
        isItalic: false,
        fontSize: 14,
      },
    ],
    createdAt: new Date('2025-01-22T10:00:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostsController],
      providers: [
        {
          provide: PostsService,
          useValue: {
            createPost: jest.fn(),
            findPosts: jest.fn(),
            findPostById: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PostsController>(PostsController);
    postsService = module.get(PostsService);
  });

  describe('createPost', () => {
    it('should create a post with images and captions', async () => {
      const createPostDto: CreatePostDto = {
        captions: [{ text: 'Test caption', orderIndex: 0 }],
      };
      const mockFiles = [
        {
          fieldname: 'images',
          originalname: 'photo.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('test'),
          size: 1024,
        },
      ] as Express.Multer.File[];

      postsService.createPost.mockResolvedValue(mockPost);

      const req = { user: mockUser } as any;
      const result = await controller.createPost(req, mockFiles, createPostDto);

      expect(result.message).toBe('피드가 생성되었습니다.');
      expect(result.post).toEqual(mockPost);
      expect(postsService.createPost).toHaveBeenCalled();
    });

    it('should throw error when no images provided', async () => {
      const createPostDto: CreatePostDto = {};
      const req = { user: mockUser } as any;

      await expect(
        controller.createPost(req, [], createPostDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when too many images provided', async () => {
      const createPostDto: CreatePostDto = {};
      const mockFiles = Array(10)
        .fill(null)
        .map(() => ({
          fieldname: 'images',
          originalname: 'photo.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('test'),
          size: 1024,
        })) as Express.Multer.File[];

      const req = { user: mockUser } as any;

      await expect(
        controller.createPost(req, mockFiles, createPostDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPosts', () => {
    it('should return paginated posts', async () => {
      const mockResponse = {
        posts: [mockPost],
        hasMore: false,
        nextCursor: null,
      };

      postsService.findPosts.mockResolvedValue(mockResponse);

      const result = await controller.getPosts('10');

      expect(result).toEqual(mockResponse);
      expect(postsService.findPosts).toHaveBeenCalledWith(10, undefined);
    });

    it('should use default limit when not provided', async () => {
      const mockResponse = {
        posts: [],
        hasMore: false,
        nextCursor: null,
      };

      postsService.findPosts.mockResolvedValue(mockResponse);

      await controller.getPosts();

      expect(postsService.findPosts).toHaveBeenCalledWith(10, undefined);
    });

    it('should pass cursor for pagination', async () => {
      const cursor = '2025-01-22T10:00:00Z';
      const mockResponse = {
        posts: [],
        hasMore: false,
        nextCursor: null,
      };

      postsService.findPosts.mockResolvedValue(mockResponse);

      await controller.getPosts('10', cursor);

      expect(postsService.findPosts).toHaveBeenCalledWith(10, cursor);
    });

    it('should throw error when limit is out of range', async () => {
      await expect(controller.getPosts('0')).rejects.toThrow(BadRequestException);
      await expect(controller.getPosts('51')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPost', () => {
    it('should return a single post', async () => {
      postsService.findPostById.mockResolvedValue(mockPost);

      const result = await controller.getPost('post-123');

      expect(result).toEqual(mockPost);
      expect(postsService.findPostById).toHaveBeenCalledWith('post-123');
    });

    it('should throw error when post not found', async () => {
      postsService.findPostById.mockResolvedValue(null);

      await expect(controller.getPost('non-existent')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
