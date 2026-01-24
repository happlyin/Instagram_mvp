import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Follow } from './entities/follow.entity';
import {
  FollowUserDto,
  PaginatedFollowListDto,
} from './dto/follow-list-response.dto';

@Injectable()
export class FollowsService {
  constructor(
    @InjectRepository(Follow)
    private followsRepository: Repository<Follow>,
  ) {}

  async toggleFollow(
    followerId: string,
    followingId: string,
  ): Promise<{ followed: boolean; followerCount: number }> {
    if (followerId === followingId) {
      throw new BadRequestException('자기 자신을 팔로우할 수 없습니다.');
    }

    const existing = await this.followsRepository.findOne({
      where: { followerId, followingId },
    });

    if (existing) {
      await this.followsRepository.delete({ id: existing.id });
      const followerCount = await this.getFollowerCount(followingId);
      return { followed: false, followerCount };
    }

    const follow = this.followsRepository.create({ followerId, followingId });
    await this.followsRepository.save(follow);
    const followerCount = await this.getFollowerCount(followingId);
    return { followed: true, followerCount };
  }

  async getFollowerCount(userId: string): Promise<number> {
    return this.followsRepository.count({
      where: { followingId: userId },
    });
  }

  async getFollowingCount(userId: string): Promise<number> {
    return this.followsRepository.count({
      where: { followerId: userId },
    });
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.followsRepository.findOne({
      where: { followerId, followingId },
    });
    return !!follow;
  }

  async getFollowStatus(
    currentUserId: string,
    targetUserId: string,
  ): Promise<{ isFollowedByMe: boolean; isFollowingMe: boolean }> {
    const [isFollowedByMe, isFollowingMe] = await Promise.all([
      this.isFollowing(currentUserId, targetUserId),
      this.isFollowing(targetUserId, currentUserId),
    ]);

    return { isFollowedByMe, isFollowingMe };
  }

  async getFollowStatusBatch(
    currentUserId: string,
    userIds: string[],
  ): Promise<Map<string, { isFollowedByMe: boolean; isFollowingMe: boolean }>> {
    const result = new Map<string, { isFollowedByMe: boolean; isFollowingMe: boolean }>();

    if (userIds.length === 0) return result;

    const [followedByMe, followingMe] = await Promise.all([
      this.followsRepository.find({
        where: { followerId: currentUserId, followingId: In(userIds) },
        select: ['followingId'],
      }),
      this.followsRepository.find({
        where: { followerId: In(userIds), followingId: currentUserId },
        select: ['followerId'],
      }),
    ]);

    const followedByMeSet = new Set(followedByMe.map((f) => f.followingId));
    const followingMeSet = new Set(followingMe.map((f) => f.followerId));

    for (const userId of userIds) {
      result.set(userId, {
        isFollowedByMe: followedByMeSet.has(userId),
        isFollowingMe: followingMeSet.has(userId),
      });
    }

    return result;
  }

  async getFollowers(
    userId: string,
    currentUserId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<PaginatedFollowListDto> {
    const queryBuilder = this.followsRepository
      .createQueryBuilder('follow')
      .leftJoinAndSelect('follow.follower', 'user')
      .where('follow.followingId = :userId', { userId })
      .orderBy('follow.createdAt', 'DESC')
      .take(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('follow.createdAt < :cursor', {
        cursor: new Date(cursor),
      });
    }

    const follows = await queryBuilder.getMany();

    const hasMore = follows.length > limit;
    if (hasMore) {
      follows.pop();
    }

    if (follows.length === 0) {
      return { users: [], hasMore: false, nextCursor: null };
    }

    const userIds = follows.map((f) => f.follower.id);
    const statusMap = await this.getFollowStatusBatch(currentUserId, userIds);

    const users: FollowUserDto[] = follows.map((f) => ({
      id: f.follower.id,
      username: f.follower.username,
      profileImageUrl: f.follower.profileImageUrl || null,
      followStatus: statusMap.get(f.follower.id) || { isFollowedByMe: false, isFollowingMe: false },
      followedAt: f.createdAt.toISOString(),
    }));

    const nextCursor = hasMore
      ? follows[follows.length - 1].createdAt.toISOString()
      : null;

    return { users, hasMore, nextCursor };
  }

  async getFollowing(
    userId: string,
    currentUserId: string,
    limit: number = 20,
    cursor?: string,
  ): Promise<PaginatedFollowListDto> {
    const queryBuilder = this.followsRepository
      .createQueryBuilder('follow')
      .leftJoinAndSelect('follow.following', 'user')
      .where('follow.followerId = :userId', { userId })
      .orderBy('follow.createdAt', 'DESC')
      .take(limit + 1);

    if (cursor) {
      queryBuilder.andWhere('follow.createdAt < :cursor', {
        cursor: new Date(cursor),
      });
    }

    const follows = await queryBuilder.getMany();

    const hasMore = follows.length > limit;
    if (hasMore) {
      follows.pop();
    }

    if (follows.length === 0) {
      return { users: [], hasMore: false, nextCursor: null };
    }

    const userIds = follows.map((f) => f.following.id);
    const statusMap = await this.getFollowStatusBatch(currentUserId, userIds);

    const users: FollowUserDto[] = follows.map((f) => ({
      id: f.following.id,
      username: f.following.username,
      profileImageUrl: f.following.profileImageUrl || null,
      followStatus: statusMap.get(f.following.id) || { isFollowedByMe: false, isFollowingMe: false },
      followedAt: f.createdAt.toISOString(),
    }));

    const nextCursor = hasMore
      ? follows[follows.length - 1].createdAt.toISOString()
      : null;

    return { users, hasMore, nextCursor };
  }
}
