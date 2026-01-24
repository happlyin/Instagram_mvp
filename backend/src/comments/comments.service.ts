import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import {
  CommentResponseDto,
  PaginatedCommentsResponseDto,
} from './dto/comment-response.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
  ) {}

  async createComment(
    userId: string,
    postId: string,
    text: string,
  ): Promise<CommentResponseDto> {
    const comment = this.commentsRepository.create({
      userId,
      postId,
      text,
    });
    await this.commentsRepository.save(comment);

    // 유저 정보 포함하여 다시 조회
    const savedComment = await this.commentsRepository.findOne({
      where: { id: comment.id },
      relations: ['user'],
    });

    return this.toResponseDto(savedComment!);
  }

  async deleteComment(userId: string, commentId: string): Promise<void> {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException('댓글을 찾을 수 없습니다.');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('본인의 댓글만 삭제할 수 있습니다.');
    }

    await this.commentsRepository.delete({ id: commentId });
  }

  async findComments(
    postId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<PaginatedCommentsResponseDto> {
    const queryBuilder = this.commentsRepository
      .createQueryBuilder('comment')
      .leftJoinAndSelect('comment.user', 'user')
      .where('comment.postId = :postId', { postId })
      .orderBy('comment.createdAt', 'DESC')
      .take(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('comment.createdAt < :cursor', {
        cursor: new Date(cursor),
      });
    }

    const comments = await queryBuilder.getMany();

    const hasMore = comments.length > limit;
    if (hasMore) {
      comments.pop();
    }

    const nextCursor =
      hasMore && comments.length > 0
        ? comments[comments.length - 1].createdAt.toISOString()
        : null;

    return {
      comments: comments.map((c) => this.toResponseDto(c)),
      hasMore,
      nextCursor,
    };
  }

  async getCommentCount(postId: string): Promise<number> {
    return this.commentsRepository.count({
      where: { postId },
    });
  }

  async getCommentCounts(postIds: string[]): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    if (postIds.length === 0) return result;

    const counts = await this.commentsRepository
      .createQueryBuilder('comment')
      .select('comment.postId', 'postId')
      .addSelect('COUNT(*)', 'count')
      .where('comment.postId IN (:...postIds)', { postIds })
      .groupBy('comment.postId')
      .getRawMany();

    const countMap = new Map(counts.map((c) => [c.postId, parseInt(c.count)]));

    for (const postId of postIds) {
      result.set(postId, countMap.get(postId) || 0);
    }

    return result;
  }

  private toResponseDto(comment: Comment): CommentResponseDto {
    return {
      id: comment.id,
      text: comment.text,
      author: {
        id: comment.user?.id || comment.userId,
        username: comment.user?.username || 'Unknown',
        profileImageUrl: comment.user?.profileImageUrl || null,
      },
      createdAt: comment.createdAt,
    };
  }
}
