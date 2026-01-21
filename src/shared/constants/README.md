# Shared Constants

이 폴더에는 클라이언트와 서버에서 공통으로 사용하는 상수가 위치합니다.

## 예시
- `api.constants.ts` - API 엔드포인트, HTTP 상태 코드
- `app.constants.ts` - 앱 설정 값
- `validation.constants.ts` - 유효성 검사 규칙

## 사용 예시
```typescript
export const API_ROUTES = {
  AUTH: '/api/auth',
  POSTS: '/api/posts',
  USERS: '/api/users',
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
```
