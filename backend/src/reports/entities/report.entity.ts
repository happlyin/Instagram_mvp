import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Post } from '../../posts/entities/post.entity';

export enum ReportReason {
  SPAM = 'spam',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  HATE_SPEECH = 'hate_speech',
}

@Entity('reports')
@Index(['reporterId', 'postId'], { unique: true })
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  reporterId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  @Column()
  @Index()
  postId: string;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post: Post;

  @Column({
    type: 'enum',
    enum: ReportReason,
  })
  reason: ReportReason;

  @CreateDateColumn()
  @Index()
  createdAt: Date;
}
