# Instagram MVP - 프로젝트 구조

## 📁 전체 구조

```
Instagram_mvp/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── layout.tsx          # 루트 레이아웃
│   │   ├── page.tsx            # 홈 페이지
│   │   └── api/                # API Routes (서버 엔드포인트)
│   │
│   ├── client/                 # 🎨 프론트엔드 (Client)
│   │   ├── components/         # React 컴포넌트
│   │   │   ├── common/         # 공통 UI (Button, Input, Modal 등)
│   │   │   ├── features/       # 기능별 컴포넌트 (Feed, Profile 등)
│   │   │   └── layout/         # 레이아웃 컴포넌트 (Header, Footer 등)
│   │   ├── hooks/              # 커스텀 React Hooks
│   │   ├── styles/             # CSS 스타일
│   │   │   └── globals.css     # 전역 스타일
│   │   ├── utils/              # 클라이언트 유틸리티
│   │   └── types/              # 클라이언트 타입 정의
│   │
│   ├── server/                 # 🔧 백엔드 (Server)
│   │   ├── api/                # API 로직
│   │   │   ├── auth/           # 인증 API
│   │   │   ├── posts/          # 게시물 API
│   │   │   ├── users/          # 사용자 API
│   │   │   ├── comments/       # 댓글 API
│   │   │   └── likes/          # 좋아요 API
│   │   ├── database/           # 데이터베이스
│   │   │   ├── entities/       # TypeORM 엔티티
│   │   │   ├── migrations/     # DB 마이그레이션
│   │   │   ├── config/         # DB 설정
│   │   │   └── connection.ts   # DB 연결
│   │   ├── services/           # 비즈니스 로직
│   │   ├── middleware/         # 서버 미들웨어
│   │   ├── utils/              # 서버 유틸리티
│   │   └── types/              # 서버 타입 정의
│   │
│   └── shared/                 # 🔄 공유 (Shared)
│       ├── types/              # 공통 타입 정의
│       └── constants/          # 공통 상수
│
├── public/                     # 정적 파일 (이미지, 폰트 등)
├── package.json
├── tsconfig.json
├── next.config.js
└── .gitignore
```

## 🎯 폴더별 역할

### 📱 Client (프론트엔드)
- **역할**: 사용자 인터페이스 및 사용자 경험
- **기술**: React, Next.js, TypeScript
- **위치**: `src/client/`

### ⚙️ Server (백엔드)
- **역할**: 비즈니스 로직, 데이터 처리, API
- **기술**: Next.js API Routes, TypeORM
- **위치**: `src/server/`

### 🔄 Shared (공유)
- **역할**: 클라이언트와 서버 간 공통 코드
- **내용**: 타입 정의, 상수, 유틸리티
- **위치**: `src/shared/`

## 🛠 TypeScript Path Alias

프로젝트에서 사용 가능한 import alias:

```typescript
// 전체 src 폴더
import { something } from '@/...'

// Client 폴더
import { Button } from '@client/components/common/Button'
import { useAuth } from '@client/hooks/useAuth'

// Server 폴더
import { UserService } from '@server/services/user.service'
import { User } from '@server/database/entities/User'

// Shared 폴더
import { API_ROUTES } from '@shared/constants/api.constants'
import { UserType } from '@shared/types/user.types'
```

## 📋 개발 가이드

### 1. 새로운 기능 추가 시

**프론트엔드 (Client):**
1. `src/client/components/` - 컴포넌트 생성
2. `src/client/hooks/` - 필요한 커스텀 hooks 추가
3. `src/app/` - 페이지 라우트 추가

**백엔드 (Server):**
1. `src/server/database/entities/` - 엔티티 정의
2. `src/server/services/` - 비즈니스 로직 작성
3. `src/app/api/` - API 엔드포인트 생성

### 2. 타입 정의
- 공통 사용: `src/shared/types/`
- 클라이언트 전용: `src/client/types/`
- 서버 전용: `src/server/types/`

### 3. 스타일링
- 전역 스타일: `src/client/styles/globals.css`
- 컴포넌트 스타일: 각 컴포넌트 폴더 내

## 🚀 다음 단계

1. TypeORM 데이터베이스 설정
2. 인증 시스템 구현
3. 게시물 CRUD API 개발
4. 프론트엔드 UI 컴포넌트 개발
5. 파일 업로드 기능 구현
