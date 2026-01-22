import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

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

  @Column({ default: 0 })
  loginCount: number; // 접속 횟수

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  lastLoginAt: Date; // 최근 접속 시간

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
