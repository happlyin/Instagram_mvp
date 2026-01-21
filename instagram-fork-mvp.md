# Instagram Fork - MVP 기능 명세

## 개발 방식

- **Claude Code plan mode 적극 활용**
- 기능 단위로 plan → implement 반복
- 각 기능 구현 전 plan mode로 설계 검토 후 진행
- **개발 기간: 1주일**

## 기술 스택

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 14, TypeScript, TailwindCSS |
| Backend | NestJS, TypeORM, PostgreSQL |
| Storage | localstack |
| Auth | JWT |

## MVP 기능

### 1. 인증
- 회원가입 (이메일, 비밀번호, 사용자명)
- 로그인 / 로그아웃
- JWT 토큰 인증

### 2. 피드
- 이미지 업로드 (다중 이미지)
- 캡션 작성
- 피드 목록 조회 (무한 스크롤)

### 3. 상호작용
- 좋아요 토글
- 댓글 작성/삭제

### 4. 팔로우
- 팔로우/언팔로우
- 팔로워/팔로잉 목록

### 5. 프로필
- 프로필 조회
- 프로필 이미지 변경
- 내 게시물 목록

### 6. 어드민
- 사용자 관리 (목록 조회, 정지/해제)
- 게시물 관리 (신고된 게시물 조회, 삭제)
- 대시보드 (가입자 수, 게시물 수, DAU 통계)
