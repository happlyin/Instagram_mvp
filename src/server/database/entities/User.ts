import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  username: string

  @Column({ unique: true })
  email: string

  @Column()
  password: string

  @Column({ nullable: true })
  fullName: string

  @Column({ nullable: true })
  bio: string

  @Column({ nullable: true })
  profileImage: string

  @Column({ default: false })
  isVerified: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // 관계는 나중에 추가
  // @OneToMany(() => Post, post => post.user)
  // posts: Post[]
}
