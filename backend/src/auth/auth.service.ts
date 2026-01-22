import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp (밀리초)
}

export interface AccessTokenResponse {
  accessToken: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 회원가입
   */
  async register(registerDto: RegisterDto): Promise<TokenResponse> {
    const { email, password, username } = registerDto;

    // 이메일 중복 체크
    const existingEmail = await this.userRepository.findOne({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    // 사용자명 중복 체크
    const existingUsername = await this.userRepository.findOne({
      where: { username },
    });
    if (existingUsername) {
      throw new ConflictException('이미 사용 중인 사용자명입니다.');
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      username,
    });
    await this.userRepository.save(user);

    // 토큰 생성 및 반환
    return this.generateTokens(user);
  }

  /**
   * 로그인
   */
  async login(loginDto: LoginDto): Promise<TokenResponse> {
    const { email, password } = loginDto;

    // 사용자 조회
    const user = await this.userRepository.findOne({
      where: { email },
    });
    if (!user) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    }

    // 로그인 정보 업데이트 (접속 횟수, 최근 접속 시간)
    await this.userRepository.update(user.id, {
      loginCount: user.loginCount + 1,
      lastLoginAt: new Date(),
    });

    // 토큰 생성 및 반환
    return this.generateTokens(user);
  }

  /**
   * Access Token 갱신
   */
  async refreshAccessToken(refreshToken: string): Promise<AccessTokenResponse> {
    // 리프레시 토큰 조회
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!tokenEntity) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    if (tokenEntity.isRevoked) {
      throw new UnauthorizedException('폐기된 리프레시 토큰입니다.');
    }

    if (new Date() > tokenEntity.expiresAt) {
      throw new UnauthorizedException('만료된 리프레시 토큰입니다.');
    }

    // 새 Access Token 생성
    const accessToken = this.generateAccessToken(tokenEntity.user);
    const expiresAt = this.getAccessTokenExpiresAt();

    return {
      accessToken,
      expiresAt,
    };
  }

  /**
   * 로그아웃 (리프레시 토큰 폐기)
   */
  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { token: refreshToken },
      { isRevoked: true },
    );
  }

  /**
   * Access Token 및 Refresh Token 생성
   */
  private async generateTokens(user: User): Promise<TokenResponse> {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);
    const expiresAt = this.getAccessTokenExpiresAt();

    // Refresh Token DB 저장
    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: this.getRefreshTokenExpiresAt(),
    });
    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * Access Token 생성
   */
  private generateAccessToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN'),
    });
  }

  /**
   * Refresh Token 생성
   */
  private generateRefreshToken(user: User): string {
    const payload = {
      sub: user.id,
      type: 'refresh',
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN'),
    });
  }

  /**
   * Access Token 만료 시간 (밀리초 Unix timestamp)
   */
  private getAccessTokenExpiresAt(): number {
    const expiresIn = this.configService.get('JWT_ACCESS_EXPIRES_IN') || '5m';
    const ms = this.parseExpiresIn(expiresIn);
    return Date.now() + ms;
  }

  /**
   * Refresh Token 만료 날짜
   */
  private getRefreshTokenExpiresAt(): Date {
    const expiresIn = this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d';
    const ms = this.parseExpiresIn(expiresIn);
    return new Date(Date.now() + ms);
  }

  /**
   * expiresIn 문자열을 밀리초로 변환
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 5 * 60 * 1000; // 기본 5분

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 5 * 60 * 1000;
    }
  }
}
