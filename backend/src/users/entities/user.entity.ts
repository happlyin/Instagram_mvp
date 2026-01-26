import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

@Entity('users')
@Index(['lastLoginAt', 'loginCount']) // 최근 접속순, 자주 접속하는 계정 우선 검색
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  password: string;

  @Column({ unique: true })
  @Index()
  username: string; // 닉네임

  @Column({ nullable: true })
  profileImageUrl: string; // 프로필 이미지 경로

  @Column({ default: 0 })
  loginCount: number; // 접속 횟수

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  lastLoginAt: Date; // 최근 접속 시간

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole; // 권한 (user, admin)

  @Column({ default: false })
  isSuspended: boolean; // 계정 정지 여부

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
