import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/**
 * 비밀번호 해싱
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * 비밀번호 검증
 */
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword)
}
