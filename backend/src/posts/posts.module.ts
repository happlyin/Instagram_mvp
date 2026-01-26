import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';
import { PostImage } from './entities/post-image.entity';
import { PostCaption } from './entities/post-caption.entity';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';
import { LikesModule } from '../likes/likes.module';
import { CommentsModule } from '../comments/comments.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, PostImage, PostCaption]),
    MulterModule.register({
      storage: memoryStorage(), // 메모리에 임시 저장 후 StorageService로 처리
    }),
    StorageModule,
    AuthModule,
    LikesModule,
    CommentsModule,
    forwardRef(() => ReportsModule),
  ],
  controllers: [PostsController],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
