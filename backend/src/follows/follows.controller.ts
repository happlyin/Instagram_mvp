import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FollowsService } from './follows.service';
import { User } from '../users/entities/user.entity';

interface AuthenticatedUser {
  userId: string;
  email: string;
  username: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class FollowsController {
  constructor(
    private readonly followsService: FollowsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  @Get(':username/followers')
  async getFollowers(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('username') username: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const targetUser = await this.userRepository.findOne({
      where: { username },
    });

    if (!targetUser) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.followsService.getFollowers(targetUser.id, req.user.userId, parsedLimit, cursor);
  }

  @Get(':username/following')
  async getFollowing(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('username') username: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const targetUser = await this.userRepository.findOne({
      where: { username },
    });

    if (!targetUser) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    return this.followsService.getFollowing(targetUser.id, req.user.userId, parsedLimit, cursor);
  }

  @Post(':username/follow')
  async toggleFollow(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('username') username: string,
  ) {
    const targetUser = await this.userRepository.findOne({
      where: { username },
    });

    if (!targetUser) {
      throw new NotFoundException('유저를 찾을 수 없습니다.');
    }

    return this.followsService.toggleFollow(req.user.userId, targetUser.id);
  }
}
