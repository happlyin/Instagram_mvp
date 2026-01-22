import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface JwtPayload {
  sub: string; // userId
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }

    super({
      // 쿠키에서 Access Token 추출
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          const token = request?.cookies?.accessToken;
          if (!token) {
            return null;
          }
          return token;
        },
      ]),
      ignoreExpiration: false, // 만료된 토큰 거부
      secretOrKey: secret,
    });
  }

  /**
   * JWT 검증 후 호출되는 메서드
   * 반환값이 request.user에 저장됨
   */
  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      username: payload.username,
    };
  }
}
