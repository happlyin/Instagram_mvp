import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserRole } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 회원가입
   * POST /auth/register
   */
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, expiresAt } =
      await this.authService.register(registerDto);

    // Access Token을 쿠키에 저장 (HttpOnly)
    this.setAccessTokenCookie(res, accessToken, expiresAt);

    return {
      message: '회원가입이 완료되었습니다.',
      refreshToken, // 클라이언트에서 로컬스토리지에 저장
      expiresAt, // 클라이언트에서 만료시간 확인용
    };
  }

  /**
   * 로그인
   * POST /auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, expiresAt, role } =
      await this.authService.login(loginDto);

    // Access Token을 쿠키에 저장 (HttpOnly)
    this.setAccessTokenCookie(res, accessToken, expiresAt);

    return {
      message: '로그인이 완료되었습니다.',
      refreshToken, // 클라이언트에서 로컬스토리지에 저장
      expiresAt, // 클라이언트에서 만료시간 확인용
      role, // 클라이언트에서 권한에 따른 리다이렉트용
    };
  }

  /**
   * Access Token 갱신
   * POST /auth/refresh
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, expiresAt } = await this.authService.refreshAccessToken(
      refreshTokenDto.refreshToken,
    );

    // 새 Access Token을 쿠키에 저장
    this.setAccessTokenCookie(res, accessToken, expiresAt);

    return {
      message: '토큰이 갱신되었습니다.',
      expiresAt,
    };
  }

  /**
   * 로그아웃
   * POST /auth/logout
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(refreshTokenDto.refreshToken);

    // Access Token 쿠키 삭제
    res.clearCookie('accessToken');
    res.clearCookie('tokenExpiresAt');

    return {
      message: '로그아웃이 완료되었습니다.',
    };
  }

  /**
   * Access Token 검증
   * GET /auth/verify
   */
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async verify(@Req() req: Request) {
    const user = req.user as { userId: string; email: string; username: string; role: UserRole };
    return {
      message: '토큰이 유효합니다.',
      valid: true,
      user: {
        userId: user.userId,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    };
  }

  /**
   * Access Token을 쿠키에 저장
   */
  private setAccessTokenCookie(
    res: Response,
    accessToken: string,
    expiresAt: number,
  ) {
    // Access Token 저장 (HttpOnly로 XSS 방지)
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 5 * 60 * 1000, // 5분
    });

    // 만료시간도 쿠키에 저장 (클라이언트에서 읽을 수 있도록 httpOnly: false)
    res.cookie('tokenExpiresAt', expiresAt.toString(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 5 * 60 * 1000, // 5분
    });
  }
}
