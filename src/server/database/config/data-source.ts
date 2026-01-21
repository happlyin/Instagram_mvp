import 'reflect-metadata'
import { DataSource } from 'typeorm'

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'instagram_mvp',
  synchronize: process.env.NODE_ENV === 'development', // 개발 환경에서만 자동 동기화
  logging: process.env.NODE_ENV === 'development',
  entities: ['src/server/database/entities/**/*.ts'],
  migrations: ['src/server/database/migrations/**/*.ts'],
  subscribers: [],
})

// 데이터베이스 초기화 함수
export const initializeDatabase = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize()
      console.log('✅ Database connection established')
    }
  } catch (error) {
    console.error('❌ Error during Data Source initialization:', error)
    throw error
  }
}
