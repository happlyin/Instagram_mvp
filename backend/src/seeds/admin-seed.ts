import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../users/entities/user.entity';

const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'adminadmin';
const ADMIN_USERNAME = 'admin';

/**
 * 관리자 계정 시드
 * 앱 시작 시 admin 계정이 없으면 생성, 있으면 업데이트
 */
export async function seedAdmin(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);

  // 기존 admin 계정 확인 (이메일 또는 username으로)
  const existingAdmin = await userRepository.findOne({
    where: [{ email: ADMIN_EMAIL }, { username: ADMIN_USERNAME }],
  });

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  if (existingAdmin) {
    // 기존 계정 업데이트
    await userRepository.update(existingAdmin.id, {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      username: ADMIN_USERNAME,
      role: UserRole.ADMIN,
      isSuspended: false,
    });
    console.log(`Admin account updated: email=${ADMIN_EMAIL}`);
    return;
  }

  // admin 계정 생성
  const admin = userRepository.create({
    email: ADMIN_EMAIL,
    password: hashedPassword,
    username: ADMIN_USERNAME,
    role: UserRole.ADMIN,
    isSuspended: false,
  });

  await userRepository.save(admin);
  console.log(`Admin account created: email=${ADMIN_EMAIL}`);
}
