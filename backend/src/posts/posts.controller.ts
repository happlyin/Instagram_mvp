import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadedFile } from '../storage/storage.service';

interface AuthenticatedUser {
  userId: string;
  email: string;
  username: string;
}

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  /**
   * 피드 생성
   * POST /posts
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FilesInterceptor('images', 9, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('허용되지 않는 이미지 형식입니다.'), false);
        }
      },
    }),
  )
  async createPost(
    @Req() req: Request,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { captions?: string },
  ) {
    const user = req.user as AuthenticatedUser;

    if (!files || files.length === 0) {
      throw new BadRequestException('최소 1개의 이미지가 필요합니다.');
    }

    if (files.length > 9) {
      throw new BadRequestException('이미지는 최대 9개까지 업로드 가능합니다.');
    }

    // caption JSON 파싱 (프론트에서는 아직 captions 배열로 보냄 - 첫번째 캡션만 사용)
    let createPostDto: CreatePostDto = {};
    if (body.captions) {
      try {
        const parsedCaptions = JSON.parse(body.captions);
        if (Array.isArray(parsedCaptions) && parsedCaptions.length > 0) {
          const firstCaption = parsedCaptions[0];
          createPostDto.caption = {
            text: firstCaption.text,
            isBold: firstCaption.isBold,
            isItalic: firstCaption.isItalic,
            fontSize: firstCaption.fontSize,
          };
        }
      } catch {
        // 파싱 실패시 무시
      }
    }

    // Multer 파일을 UploadedFile 형식으로 변환
    const uploadedFiles: UploadedFile[] = files.map((file) => ({
      fieldname: file.fieldname,
      originalname: file.originalname,
      encoding: file.encoding,
      mimetype: file.mimetype,
      buffer: file.buffer,
      size: file.size,
    }));

    const post = await this.postsService.createPost(
      user.userId,
      createPostDto,
      uploadedFiles,
    );

    return {
      message: '피드가 생성되었습니다.',
      post,
    };
  }

  /**
   * 피드 목록 조회 (페이지네이션)
   * GET /posts?limit=10&cursor=2025-01-22T10:00:00Z
   */
  @Get()
  async getPosts(
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;

    if (parsedLimit < 1 || parsedLimit > 50) {
      throw new BadRequestException('limit은 1-50 사이여야 합니다.');
    }

    return this.postsService.findPosts(parsedLimit, cursor);
  }

  /**
   * 단일 피드 조회
   * GET /posts/:id
   */
  @Get(':id')
  async getPost(@Param('id') id: string) {
    const post = await this.postsService.findPostById(id);

    if (!post) {
      throw new BadRequestException('피드를 찾을 수 없습니다.');
    }

    return post;
  }
}
