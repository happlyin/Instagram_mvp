import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Post } from './entities/post.entity';
import { PostImage } from './entities/post-image.entity';
import { PostCaption } from './entities/post-caption.entity';
import { StorageService, UploadedFile, StoredFile } from '../storage/storage.service';
import { LikesService } from '../likes/likes.service';
import { CommentsService } from '../comments/comments.service';
import { ReportsService } from '../reports/reports.service';
import { CreatePostDto, CreateCaptionDto } from './dto/create-post.dto';
import {
  PostResponseDto,
  PostImageResponseDto,
  PostCaptionResponseDto,
  PostAuthorDto,
  PaginatedPostsResponseDto,
} from './dto/post-response.dto';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postsRepository: Repository<Post>,
    @InjectRepository(PostImage)
    private postImagesRepository: Repository<PostImage>,
    @InjectRepository(PostCaption)
    private postCaptionsRepository: Repository<PostCaption>,
    private storageService: StorageService,
    private likesService: LikesService,
    private commentsService: CommentsService,
    @Inject(forwardRef(() => ReportsService))
    private reportsService: ReportsService,
  ) {}

  async createPost(
    userId: string,
    createPostDto: CreatePostDto,
    imageFiles: UploadedFile[],
  ): Promise<PostResponseDto> {
    // 1. 이미지 업로드
    const storedFiles = await this.storageService.uploadFiles(imageFiles, userId);

    // 2. Post 생성
    const post = this.postsRepository.create({
      userId,
    });
    const savedPost = await this.postsRepository.save(post);

    // 3. PostImage 생성
    const images = await this.createPostImages(savedPost.id, storedFiles);

    // 4. PostCaption 생성 (단일 캡션)
    if (createPostDto.caption?.text) {
      await this.createPostCaption(savedPost.id, createPostDto.caption);
    }

    // 5. Post 조회 (관계 포함)
    const fullPost = await this.findPostById(savedPost.id, userId);
    if (!fullPost) {
      throw new NotFoundException('생성된 포스트를 찾을 수 없습니다.');
    }

    return fullPost;
  }

  private async createPostImages(
    postId: string,
    storedFiles: StoredFile[],
  ): Promise<PostImage[]> {
    const images = storedFiles.map((file, index) =>
      this.postImagesRepository.create({
        postId,
        imageUrl: file.url,
        orderIndex: index,
        originalFileName: file.originalFileName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
      }),
    );

    return this.postImagesRepository.save(images);
  }

  private async createPostCaption(
    postId: string,
    caption: CreateCaptionDto,
  ): Promise<PostCaption> {
    const postCaption = this.postCaptionsRepository.create({
      postId,
      text: caption.text || '',
      orderIndex: 0,
      isBold: caption.isBold ?? false,
      isItalic: caption.isItalic ?? false,
      fontSize: caption.fontSize ?? 14,
    });

    return this.postCaptionsRepository.save(postCaption);
  }

  async findPostById(id: string, currentUserId?: string): Promise<PostResponseDto | null> {
    const post = await this.postsRepository.findOne({
      where: { id },
      relations: ['user', 'images', 'captions'],
      order: {
        images: { orderIndex: 'ASC' },
        captions: { orderIndex: 'ASC' },
      },
    });

    if (!post) return null;

    // 좋아요/댓글 정보 조회
    const likeInfo = currentUserId
      ? await this.likesService.getLikeInfoForPosts([id], currentUserId)
      : new Map();
    const commentCounts = await this.commentsService.getCommentCounts([id]);

    const postLikeInfo = likeInfo.get(id) || { likeCount: 0, isLikedByMe: false };
    const commentCount = commentCounts.get(id) || 0;

    return this.toResponseDto(post, postLikeInfo.likeCount, postLikeInfo.isLikedByMe, commentCount);
  }

  async findPosts(
    limit: number = 10,
    cursor?: string,
    currentUserId?: string,
    filterUserId?: string,
  ): Promise<PaginatedPostsResponseDto> {
    // 현재 유저가 신고한 게시물 ID 목록 조회
    const reportedPostIds = currentUserId
      ? await this.reportsService.getReportedPostIdsByUser(currentUserId)
      : [];

    const queryBuilder = this.postsRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.images', 'images')
      .leftJoinAndSelect('post.captions', 'captions')
      .where('post.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('post.createdAt', 'DESC')
      .addOrderBy('images.orderIndex', 'ASC')
      .addOrderBy('captions.orderIndex', 'ASC')
      .take(limit + 1); // 다음 페이지 존재 여부 확인을 위해 +1

    // 신고한 게시물 제외
    if (reportedPostIds.length > 0) {
      queryBuilder.andWhere('post.id NOT IN (:...reportedPostIds)', { reportedPostIds });
    }

    if (filterUserId) {
      queryBuilder.andWhere('post.userId = :filterUserId', { filterUserId });
    }

    if (cursor) {
      const cursorDate = new Date(cursor);
      queryBuilder.andWhere('post.createdAt < :cursor', { cursor: cursorDate });
    }

    const posts = await queryBuilder.getMany();

    const hasMore = posts.length > limit;
    if (hasMore) {
      posts.pop(); // 초과분 제거
    }

    // 배치로 좋아요/댓글 정보 조회 (N+1 방지)
    const postIds = posts.map((p) => p.id);
    const likeInfoMap = currentUserId
      ? await this.likesService.getLikeInfoForPosts(postIds, currentUserId)
      : new Map();
    const commentCountMap = await this.commentsService.getCommentCounts(postIds);

    const postDtos = posts.map((post) => {
      const likeInfo = likeInfoMap.get(post.id) || { likeCount: 0, isLikedByMe: false };
      const commentCount = commentCountMap.get(post.id) || 0;
      return this.toResponseDto(post, likeInfo.likeCount, likeInfo.isLikedByMe, commentCount);
    });

    const nextCursor =
      hasMore && posts.length > 0
        ? posts[posts.length - 1].createdAt.toISOString()
        : null;

    return {
      posts: postDtos,
      hasMore,
      nextCursor,
    };
  }

  private toResponseDto(
    post: Post,
    likeCount: number = 0,
    isLikedByMe: boolean = false,
    commentCount: number = 0,
  ): PostResponseDto {
    const author: PostAuthorDto = {
      id: post.user?.id || post.userId,
      username: post.user?.username || 'Unknown',
      profileImageUrl: post.user?.profileImageUrl || null,
    };

    const images: PostImageResponseDto[] = (post.images || [])
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((img) => ({
        id: img.id,
        imageUrl: img.imageUrl,
        orderIndex: img.orderIndex,
        originalFileName: img.originalFileName,
        mimeType: img.mimeType,
      }));

    // 첫 번째 캡션만 사용 (단일 캡션)
    const sortedCaptions = (post.captions || []).sort(
      (a, b) => a.orderIndex - b.orderIndex,
    );
    const caption: PostCaptionResponseDto | null =
      sortedCaptions.length > 0
        ? {
            id: sortedCaptions[0].id,
            text: sortedCaptions[0].text,
            isBold: sortedCaptions[0].isBold,
            isItalic: sortedCaptions[0].isItalic,
            fontSize: sortedCaptions[0].fontSize,
          }
        : null;

    return {
      id: post.id,
      author,
      images,
      caption,
      likeCount,
      isLikedByMe,
      commentCount,
      createdAt: post.createdAt,
    };
  }
}
