# Server Database

이 폴더에는 데이터베이스 관련 파일이 위치합니다.

## 구조
- `entities/` - TypeORM 엔티티 (User, Post, Comment 등)
- `migrations/` - 데이터베이스 마이그레이션 파일
- `config/` - 데이터베이스 설정 파일
- `connection.ts` - DB 연결 설정

## TypeORM 설정
Instagram MVP는 TypeORM을 사용하여 데이터베이스를 관리합니다.
