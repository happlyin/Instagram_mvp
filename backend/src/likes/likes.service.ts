import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Like } from './entities/like.entity';

export interface LikeToggleResult {
  liked: boolean;
  likeCount: number;
}

export interface LikeInfo {
  likeCount: number;
  isLikedByMe: boolean;
}

@Injectable()
export class LikesService {
  constructor(
    @InjectRepository(Like)
    private likesRepository: Repository<Like>,
  ) {}

  async toggleLike(userId: string, postId: string): Promise<LikeToggleResult> {
    const existingLike = await this.likesRepository.findOne({
      where: { userId, postId },
    });

    if (existingLike) {
      await this.likesRepository.delete({ id: existingLike.id });
    } else {
      const like = this.likesRepository.create({ userId, postId });
      await this.likesRepository.save(like);
    }

    const likeCount = await this.getLikeCount(postId);

    return {
      liked: !existingLike,
      likeCount,
    };
  }

  async getLikeCount(postId: string): Promise<number> {
    return this.likesRepository.count({
      where: { postId },
    });
  }

  async isLikedByUser(userId: string, postId: string): Promise<boolean> {
    const like = await this.likesRepository.findOne({
      where: { userId, postId },
    });
    return !!like;
  }

  async getLikeInfoForPosts(
    postIds: string[],
    userId: string,
  ): Promise<Map<string, LikeInfo>> {
    const result = new Map<string, LikeInfo>();

    if (postIds.length === 0) return result;

    // 각 포스트의 좋아요 수 배치 조회
    const counts = await this.likesRepository
      .createQueryBuilder('like')
      .select('like.postId', 'postId')
      .addSelect('COUNT(*)', 'count')
      .where('like.postId IN (:...postIds)', { postIds })
      .groupBy('like.postId')
      .getRawMany();

    // 현재 유저가 좋아요 누른 포스트 목록
    const userLikes = await this.likesRepository.find({
      where: { userId, postId: In(postIds) },
    });
    const likedPostIds = new Set(userLikes.map((l) => l.postId));

    // 결과 맵 생성
    const countMap = new Map(counts.map((c) => [c.postId, parseInt(c.count)]));

    for (const postId of postIds) {
      result.set(postId, {
        likeCount: countMap.get(postId) || 0,
        isLikedByMe: likedPostIds.has(postId),
      });
    }

    return result;
  }
}
