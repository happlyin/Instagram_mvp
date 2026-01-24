import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

describe('CommentsController', () => {
  let controller: CommentsController;

  const mockCommentsService = {
    createComment: jest.fn(),
    findComments: jest.fn(),
    deleteComment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        {
          provide: CommentsService,
          useValue: mockCommentsService,
        },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /posts/:postId/comments', () => {
    it('댓글을 생성하고 반환해야 한다', async () => {
      const req = { user: { userId: 'user-1' } } as any;
      const body = { text: '좋은 사진!' };
      const expectedResponse = {
        id: 'comment-1',
        text: '좋은 사진!',
        author: { id: 'user-1', username: 'testuser' },
        createdAt: new Date(),
      };

      mockCommentsService.createComment.mockResolvedValue(expectedResponse);

      const result = await controller.createComment(req, 'post-1', body);

      expect(mockCommentsService.createComment).toHaveBeenCalledWith(
        'user-1',
        'post-1',
        '좋은 사진!',
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('GET /posts/:postId/comments', () => {
    it('댓글 목록을 페이지네이션하여 반환해야 한다', async () => {
      const expectedResponse = {
        comments: [
          { id: 'comment-1', text: '댓글1', author: { id: 'user-1', username: 'user1' }, createdAt: new Date() },
        ],
        hasMore: false,
        nextCursor: null,
      };

      mockCommentsService.findComments.mockResolvedValue(expectedResponse);

      const result = await controller.getComments('post-1', '20', undefined);

      expect(mockCommentsService.findComments).toHaveBeenCalledWith('post-1', 20, undefined);
      expect(result).toEqual(expectedResponse);
    });

    it('cursor를 전달하면 해당 커서부터 조회해야 한다', async () => {
      const cursor = '2025-01-22T10:00:00Z';
      mockCommentsService.findComments.mockResolvedValue({
        comments: [],
        hasMore: false,
        nextCursor: null,
      });

      await controller.getComments('post-1', '20', cursor);

      expect(mockCommentsService.findComments).toHaveBeenCalledWith('post-1', 20, cursor);
    });
  });

  describe('DELETE /comments/:commentId', () => {
    it('본인 댓글을 삭제할 수 있어야 한다', async () => {
      const req = { user: { userId: 'user-1' } } as any;
      mockCommentsService.deleteComment.mockResolvedValue(undefined);

      const result = await controller.deleteComment(req, 'comment-1');

      expect(mockCommentsService.deleteComment).toHaveBeenCalledWith('user-1', 'comment-1');
      expect(result).toEqual({ message: '댓글이 삭제되었습니다.' });
    });

    it('다른 유저 댓글 삭제 시 ForbiddenException을 던져야 한다', async () => {
      const req = { user: { userId: 'user-1' } } as any;
      mockCommentsService.deleteComment.mockRejectedValue(
        new ForbiddenException('본인의 댓글만 삭제할 수 있습니다.'),
      );

      await expect(
        controller.deleteComment(req, 'comment-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
