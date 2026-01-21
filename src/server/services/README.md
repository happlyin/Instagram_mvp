# Server Services

이 폴더에는 비즈니스 로직을 담당하는 서비스 레이어가 위치합니다.

## 구조
- `auth.service.ts` - 인증 관련 비즈니스 로직
- `post.service.ts` - 게시물 관련 비즈니스 로직
- `user.service.ts` - 사용자 관련 비즈니스 로직
- `upload.service.ts` - 파일 업로드 처리

## 역할
- API Route와 데이터베이스 사이의 비즈니스 로직 처리
- 데이터 검증 및 변환
- 복잡한 쿼리 및 트랜잭션 관리
