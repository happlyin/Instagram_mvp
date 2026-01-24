import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { FollowsService } from '../follows/follows.service';
import { StorageService, UploadedFile } from '../storage/storage.service';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProfileService {
  private readonly baseUrl: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    private readonly followsService: FollowsService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      configService.get<string>('UPLOAD_BASE_URL') ||
      'http://localhost:4000/uploads/images';
  }

  async getProfile(
    username: string,
    currentUserId: string,
  ): Promise<ProfileResponseDto> {
    const user = await this.userRepository.findOne({
      where: { username },
    });

    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    const [postCount, followerCount, followingCount] = await Promise.all([
      this.postRepository.count({ where: { userId: user.id } }),
      this.followsService.getFollowerCount(user.id),
      this.followsService.getFollowingCount(user.id),
    ]);

    let isFollowedByMe = false;
    let isFollowingMe = false;

    if (currentUserId !== user.id) {
      const followStatus = await this.followsService.getFollowStatus(
        currentUserId,
        user.id,
      );
      isFollowedByMe = followStatus.isFollowedByMe;
      isFollowingMe = followStatus.isFollowingMe;
    }

    return {
      id: user.id,
      username: user.username,
      profileImageUrl: user.profileImageUrl || null,
      postCount,
      followerCount,
      followingCount,
      isFollowedByMe,
      isFollowingMe,
    };
  }

  async updateProfileImage(
    userId: string,
    file: UploadedFile,
  ): Promise<{ profileImageUrl: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    // 기존 프로필 이미지 삭제
    if (user.profileImageUrl) {
      const oldKey = this.extractKeyFromUrl(user.profileImageUrl);
      if (oldKey) {
        await this.storageService.deleteFile(oldKey);
      }
    }

    // 새 이미지 업로드
    const storedFile = await this.storageService.uploadFile(file, userId);

    // DB 업데이트
    user.profileImageUrl = storedFile.url;
    await this.userRepository.save(user);

    return { profileImageUrl: storedFile.url };
  }

  private extractKeyFromUrl(url: string): string | null {
    if (!url) return null;
    const prefix = this.baseUrl + '/';
    if (url.startsWith(prefix)) {
      return url.substring(prefix.length);
    }
    return null;
  }
}
