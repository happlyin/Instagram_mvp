import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Post } from './post.entity';

@Entity('post_images')
@Index(['postId', 'orderIndex']) // 포스트별 이미지 순서 조회용
export class PostImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  postId: string;

  @ManyToOne(() => Post, (post) => post.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column()
  imageUrl: string; // S3/MinIO 저장 경로

  @Column()
  orderIndex: number; // 이미지 순서 (0부터 시작)

  @Column({ nullable: true })
  originalFileName: string; // 원본 파일명

  @Column({ nullable: true })
  mimeType: string; // 파일 타입 (image/jpeg, image/png 등)

  @Column({ type: 'int', nullable: true })
  fileSize: number; // 파일 크기 (bytes)

  @CreateDateColumn()
  createdAt: Date;
}
