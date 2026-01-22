import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('토큰이 만료되었습니다.');
      }
      if (info?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('유효하지 않은 토큰입니다.');
      }
      throw new UnauthorizedException('인증이 필요합니다.');
    }
    return user;
  }
}
