# Server Middleware

이 폴더에는 서버 미들웨어가 위치합니다.

## 구조
- `auth.middleware.ts` - 인증 검증 미들웨어
- `validation.middleware.ts` - 요청 데이터 유효성 검사
- `error.middleware.ts` - 에러 핸들링
- `logger.middleware.ts` - 로깅

## 역할
- API 요청 전처리
- 권한 검증
- 요청/응답 로깅
