import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { Report } from '../reports/entities/report.entity';
import { Comment } from '../comments/entities/comment.entity';
import { Like } from '../likes/entities/like.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Post, Report, Comment, Like])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
