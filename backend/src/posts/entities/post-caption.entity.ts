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

@Entity('post_captions')
@Index(['postId', 'orderIndex']) // 포스트별 캡션 순서 조회용
export class PostCaption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  postId: string;

  @ManyToOne(() => Post, (post) => post.captions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column({ type: 'text' })
  text: string; // 캡션 텍스트

  @Column()
  orderIndex: number; // 캡션 순서 (0부터 시작)

  @Column({ default: false })
  isBold: boolean; // 볼드 여부

  @Column({ default: false })
  isItalic: boolean; // 이탤릭 여부

  @Column({ type: 'int', default: 14 })
  fontSize: number; // 폰트 크기 (px)

  @CreateDateColumn()
  createdAt: Date;
}
