import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';
import { PostImage } from './entities/post-image.entity';
import { PostCaption } from './entities/post-caption.entity';
import { StorageService, StoredFile, UploadedFile } from '../storage/storage.service';
import { CreatePostDto } from './dto/create-post.dto';

describe('PostsService', () => {
  let service: PostsService;
  let postRepository: jest.Mocked<Repository<Post>>;
  let postImageRepository: jest.Mocked<Repository<PostImage>>;
  let postCaptionRepository: jest.Mocked<Repository<PostCaption>>;
  let storageService: jest.Mocked<StorageService>;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@test.com',
  };

  const mockPost: Partial<Post> = {
    id: 'post-123',
    userId: 'user-123',
    user: mockUser as any,
    images: [],
    captions: [],
    createdAt: new Date('2025-01-22T10:00:00Z'),
    updatedAt: new Date('2025-01-22T10:00:00Z'),
  };

  const mockStoredFiles: StoredFile[] = [
    {
      url: 'http://localhost:4000/uploads/images/user-123/image1.jpg',
      key: 'user-123/image1.jpg',
      originalFileName: 'photo1.jpg',
      mimeType: 'image/jpeg',
      fileSize: 1024,
    },
    {
      url: 'http://localhost:4000/uploads/images/user-123/image2.jpg',
      key: 'user-123/image2.jpg',
      originalFileName: 'photo2.jpg',
      mimeType: 'image/jpeg',
      fileSize: 2048,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        {
          provide: getRepositoryToken(Post),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PostImage),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(PostCaption),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFiles: jest.fn(),
            uploadFile: jest.fn(),
            deleteFile: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    postRepository = module.get(getRepositoryToken(Post));
    postImageRepository = module.get(getRepositoryToken(PostImage));
    postCaptionRepository = module.get(getRepositoryToken(PostCaption));
    storageService = module.get(StorageService);
  });

  describe('createPost', () => {
    it('should create a post with images and captions', async () => {
      const userId = 'user-123';
      const createPostDto: CreatePostDto = {
        captions: [
          { text: 'First caption', orderIndex: 0, isBold: true },
          { text: 'Second caption', orderIndex: 1, isItalic: true, fontSize: 18 },
        ],
      };
      const imageFiles: UploadedFile[] = [
        {
          fieldname: 'images',
          originalname: 'photo1.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('image1'),
          size: 1024,
        },
      ];

      const mockImages: PostImage[] = [
        {
          id: 'img-1',
          postId: 'post-123',
          imageUrl: mockStoredFiles[0].url,
          orderIndex: 0,
          originalFileName: 'photo1.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          createdAt: new Date(),
        } as PostImage,
      ];

      const mockCaptions: PostCaption[] = [
        {
          id: 'cap-1',
          postId: 'post-123',
          text: 'First caption',
          orderIndex: 0,
          isBold: true,
          isItalic: false,
          fontSize: 14,
          createdAt: new Date(),
        } as PostCaption,
        {
          id: 'cap-2',
          postId: 'post-123',
          text: 'Second caption',
          orderIndex: 1,
          isBold: false,
          isItalic: true,
          fontSize: 18,
          createdAt: new Date(),
        } as PostCaption,
      ];

      storageService.uploadFiles.mockResolvedValue([mockStoredFiles[0]]);
      postRepository.create.mockReturnValue(mockPost as Post);
      postRepository.save.mockResolvedValue(mockPost as Post);
      postImageRepository.create.mockImplementation((data) => data as PostImage);
      postImageRepository.save.mockResolvedValue(mockImages);
      postCaptionRepository.create.mockImplementation((data) => data as PostCaption);
      postCaptionRepository.save.mockResolvedValue(mockCaptions);
      postRepository.findOne.mockResolvedValue({
        ...mockPost,
        images: mockImages,
        captions: mockCaptions,
      } as Post);

      const result = await service.createPost(userId, createPostDto, imageFiles);

      expect(storageService.uploadFiles).toHaveBeenCalledWith(imageFiles, userId);
      expect(postRepository.create).toHaveBeenCalledWith({ userId });
      expect(postRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('post-123');
      expect(result.images).toHaveLength(1);
      expect(result.captions).toHaveLength(2);
      expect(result.captions[0].isBold).toBe(true);
      expect(result.captions[1].isItalic).toBe(true);
    });

    it('should create a post without captions', async () => {
      const userId = 'user-123';
      const createPostDto: CreatePostDto = {};
      const imageFiles: UploadedFile[] = [
        {
          fieldname: 'images',
          originalname: 'photo1.jpg',
          encoding: '7bit',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('image1'),
          size: 1024,
        },
      ];

      const mockImages: PostImage[] = [
        {
          id: 'img-1',
          postId: 'post-123',
          imageUrl: mockStoredFiles[0].url,
          orderIndex: 0,
          originalFileName: 'photo1.jpg',
          mimeType: 'image/jpeg',
          fileSize: 1024,
          createdAt: new Date(),
        } as PostImage,
      ];

      storageService.uploadFiles.mockResolvedValue([mockStoredFiles[0]]);
      postRepository.create.mockReturnValue(mockPost as Post);
      postRepository.save.mockResolvedValue(mockPost as Post);
      postImageRepository.create.mockImplementation((data) => data as PostImage);
      postImageRepository.save.mockResolvedValue(mockImages);
      postRepository.findOne.mockResolvedValue({
        ...mockPost,
        images: mockImages,
        captions: [],
      } as Post);

      const result = await service.createPost(userId, createPostDto, imageFiles);

      expect(result.captions).toHaveLength(0);
      expect(result.images).toHaveLength(1);
    });
  });

  describe('findPostById', () => {
    it('should return a post by id', async () => {
      const postWithRelations = {
        ...mockPost,
        images: [
          {
            id: 'img-1',
            imageUrl: 'http://test.com/img1.jpg',
            orderIndex: 0,
            originalFileName: 'img1.jpg',
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
      } as Post;

      postRepository.findOne.mockResolvedValue(postWithRelations);

      const result = await service.findPostById('post-123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('post-123');
      expect(result!.author.username).toBe('testuser');
      expect(result!.images).toHaveLength(1);
      expect(result!.captions).toHaveLength(1);
    });

    it('should return null if post not found', async () => {
      postRepository.findOne.mockResolvedValue(null);

      const result = await service.findPostById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findPosts', () => {
    it('should return paginated posts', async () => {
      const mockPosts = [
        {
          ...mockPost,
          id: 'post-1',
          createdAt: new Date('2025-01-22T12:00:00Z'),
          images: [],
          captions: [],
        },
        {
          ...mockPost,
          id: 'post-2',
          createdAt: new Date('2025-01-22T11:00:00Z'),
          images: [],
          captions: [],
        },
      ];

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockPosts),
      };

      postRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findPosts(10);

      expect(result.posts).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('post.createdAt', 'DESC');
    });

    it('should handle cursor-based pagination', async () => {
      const mockPosts = Array(11)
        .fill(null)
        .map((_, i) => ({
          ...mockPost,
          id: `post-${i}`,
          createdAt: new Date(Date.now() - i * 3600000), // 1시간씩 과거
          images: [],
          captions: [],
        }));

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockPosts),
      };

      postRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findPosts(10, '2025-01-22T12:00:00Z');

      expect(result.hasMore).toBe(true);
      expect(result.posts).toHaveLength(10);
      expect(result.nextCursor).not.toBeNull();
      expect(mockQueryBuilder.where).toHaveBeenCalled();
    });

    it('should return empty array when no posts', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      postRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.findPosts(10);

      expect(result.posts).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
  });
});
