import {
  Controller,
  Post,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

interface AuthenticatedUser {
  userId: string;
  email: string;
  username: string;
}

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post(':postId/like')
  @HttpCode(HttpStatus.OK)
  async toggleLike(
    @Req() req: Request,
    @Param('postId') postId: string,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.likesService.toggleLike(user.userId, postId);
  }
}
