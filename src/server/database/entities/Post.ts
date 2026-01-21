import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'
import { User } from './User'

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  imageUrl: string

  @Column({ type: 'text', nullable: true })
  caption: string

  @Column({ type: 'int', default: 0 })
  likesCount: number

  @Column({ type: 'int', default: 0 })
  commentsCount: number

  @Column()
  userId: string

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // 관계는 나중에 추가
  // @OneToMany(() => Comment, comment => comment.post)
  // comments: Comment[]

  // @OneToMany(() => Like, like => like.post)
  // likes: Like[]
}
