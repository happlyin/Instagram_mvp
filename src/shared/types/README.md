# Shared Types

이 폴더에는 클라이언트와 서버에서 공통으로 사용하는 TypeScript 타입이 위치합니다.

## 예시
- `user.types.ts` - 사용자 공통 타입
- `post.types.ts` - 게시물 공통 타입
- `common.types.ts` - 전역 공통 타입

## 사용 예시
```typescript
// Client와 Server 모두에서 import 가능
import { User, Post } from '@/shared/types'
```
