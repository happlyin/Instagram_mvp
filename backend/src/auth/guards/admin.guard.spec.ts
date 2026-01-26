import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { UserRole } from '../../users/entities/user.entity';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  const createMockContext = (user: { role: UserRole } | null): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as ExecutionContext;
  };

  it('관리자 권한이 있으면 true를 반환해야 한다', () => {
    const context = createMockContext({ role: UserRole.ADMIN });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('일반 사용자 권한이면 ForbiddenException을 던져야 한다', () => {
    const context = createMockContext({ role: UserRole.USER });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('관리자 권한이 필요합니다.');
  });

  it('인증되지 않은 요청은 ForbiddenException을 던져야 한다', () => {
    const context = createMockContext(null);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow('관리자 권한이 필요합니다.');
  });
});
