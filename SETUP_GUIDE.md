# Instagram MVP - 설치 및 설정 가이드

## ✅ 설치 완료된 기술 스택

### Frontend
- ✅ **Next.js 14** - React 프레임워크
- ✅ **TypeScript** - 타입 안정성
- ✅ **Tailwind CSS** - 유틸리티 CSS 프레임워크

### Backend
- ✅ **TypeORM** - ORM (Object-Relational Mapping)
- ✅ **PostgreSQL** - 데이터베이스 (pg 드라이버)
- ✅ **JWT** - 인증 (jsonwebtoken)
- ✅ **bcryptjs** - 비밀번호 해싱

### Storage
- ✅ **AWS SDK** - S3 연동
- ✅ **Localstack** - AWS 로컬 환경

---

## 🚀 시작하기

### 1. 환경변수 설정

`.env` 파일이 이미 생성되어 있습니다. 필요시 수정하세요:

```bash
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=instagram_mvp

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# AWS / Localstack
AWS_REGION=us-east-1
AWS_ENDPOINT=http://localhost:4566
S3_BUCKET_NAME=instagram-mvp-uploads
```

### 2. Docker로 PostgreSQL & Localstack 실행

```bash
docker-compose up -d
```

이 명령어는 다음을 실행합니다:
- PostgreSQL (포트 5432)
- Localstack S3 (포트 4566)

### 3. 개발 서버 실행

```bash
npm run dev
# 또는
& 'C:\Program Files\nodejs\node.exe' 'C:\Users\USER\Documents\GitHub\Instagram_mvp\node_modules\next\dist\bin\next' dev
```

브라우저에서 http://localhost:3000 접속

---

## 📁 주요 파일 구조

```
src/
├── client/                     # 프론트엔드
│   ├── components/             # React 컴포넌트
│   └── styles/
│       └── globals.css         # Tailwind 설정 포함
│
├── server/                     # 백엔드
│   ├── database/
│   │   ├── config/
│   │   │   └── data-source.ts  # TypeORM 설정
│   │   └── entities/
│   │       ├── User.ts         # User 엔티티
│   │       └── Post.ts         # Post 엔티티
│   └── utils/
│       ├── jwt.ts              # JWT 토큰 관리
│       ├── hash.ts             # 비밀번호 해싱
│       └── s3.ts               # S3 파일 업로드
│
└── shared/                     # 공유 코드
    ├── types/
    └── constants/
```

---

## 🎨 Tailwind CSS 사용법

### 기본 사용
```tsx
<div className="bg-white p-4 rounded-lg shadow-md">
  <h1 className="text-2xl font-bold text-gray-900">Title</h1>
  <button className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded">
    Click me
  </button>
</div>
```

### Instagram 브랜드 컬러
```tsx
<div className="bg-instagram-primary text-white">
  Instagram Color
</div>
```

사용 가능한 커스텀 컬러:
- `instagram-primary` - #E4405F
- `instagram-blue` - #3897F0
- `instagram-purple` - #833AB4

---

## 🗄️ TypeORM 사용법

### 데이터베이스 연결
```typescript
import { AppDataSource, initializeDatabase } from '@server/database/config/data-source'

// 앱 시작 시 호출
await initializeDatabase()
```

### 엔티티 사용
```typescript
import { AppDataSource } from '@server/database/config/data-source'
import { User } from '@server/database/entities/User'

const userRepository = AppDataSource.getRepository(User)

// 생성
const user = userRepository.create({
  username: 'john_doe',
  email: 'john@example.com',
  password: hashedPassword,
})
await userRepository.save(user)

// 조회
const users = await userRepository.find()
const user = await userRepository.findOne({ where: { id: '...' } })
```

---

## 🔐 JWT 인증 사용법

```typescript
import { generateToken, verifyToken } from '@server/utils/jwt'

// 토큰 생성
const token = generateToken({
  userId: user.id,
  email: user.email,
  username: user.username,
})

// 토큰 검증
try {
  const payload = verifyToken(token)
  console.log(payload.userId)
} catch (error) {
  console.error('Invalid token')
}
```

---

## 📦 파일 업로드 (S3/Localstack)

```typescript
import { uploadToS3, deleteFromS3 } from '@server/utils/s3'

// 파일 업로드
const fileUrl = await uploadToS3(
  fileBuffer,
  'uploads/image.jpg',
  'image/jpeg'
)

// 파일 삭제
await deleteFromS3('uploads/image.jpg')
```

---

## 🔧 개발 도구

### TypeScript Path Alias
```typescript
import { Button } from '@client/components/common/Button'
import { UserService } from '@server/services/user.service'
import { API_ROUTES } from '@shared/constants/api.constants'
```

### Docker 명령어
```bash
# 서비스 시작
docker-compose up -d

# 서비스 중지
docker-compose down

# 로그 확인
docker-compose logs -f postgres
docker-compose logs -f localstack

# 데이터 초기화 (볼륨 삭제)
docker-compose down -v
```

---

## 📝 다음 단계

1. ✅ 기본 설정 완료
2. 🔲 API 엔드포인트 개발 (`src/app/api/`)
3. 🔲 UI 컴포넌트 개발 (`src/client/components/`)
4. 🔲 인증 시스템 구현
5. 🔲 게시물 CRUD 기능
6. 🔲 이미지 업로드 기능

---

## 🐛 문제 해결

### PostgreSQL 연결 실패
- Docker가 실행 중인지 확인
- `.env` 파일의 DB 설정 확인
- `docker-compose logs postgres` 로그 확인

### Localstack S3 연결 실패
- Localstack 컨테이너 실행 확인: `docker ps`
- 포트 4566이 사용 가능한지 확인

### Next.js 빌드 에러
- `node_modules` 삭제 후 재설치: `npm install`
- `.next` 폴더 삭제 후 재시작

---

## 📚 참고 문서

- [Next.js 공식 문서](https://nextjs.org/docs)
- [Tailwind CSS 공식 문서](https://tailwindcss.com/docs)
- [TypeORM 공식 문서](https://typeorm.io/)
- [Localstack 공식 문서](https://docs.localstack.cloud/)
