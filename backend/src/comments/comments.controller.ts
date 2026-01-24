import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedUser {
  userId: string;
  email: string;
  username: string;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('posts/:postId/comments')
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @Req() req: Request,
    @Param('postId') postId: string,
    @Body() body: CreateCommentDto,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.commentsService.createComment(user.userId, postId, body.text);
  }

  @Get('posts/:postId/comments')
  async getComments(
    @Param('postId') postId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.commentsService.findComments(postId, parsedLimit, cursor);
  }

  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.OK)
  async deleteComment(
    @Req() req: Request,
    @Param('commentId') commentId: string,
  ) {
    const user = req.user as AuthenticatedUser;
    await this.commentsService.deleteComment(user.userId, commentId);
    return { message: '댓글이 삭제되었습니다.' };
  }
}
