import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// bcrypt 모듈 전체를 mock
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn(),
}));

import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;
  let jwtService: JwtService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockRefreshTokenRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        JWT_ACCESS_SECRET: 'test-access-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_ACCESS_EXPIRES_IN: '5m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = module.get<Repository<RefreshToken>>(
      getRepositoryToken(RefreshToken),
    );
    jwtService = module.get<JwtService>(JwtService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('회원가입 (register)', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
    };

    it('새로운 사용자를 성공적으로 등록해야 한다', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        id: 'uuid-1234',
        ...registerDto,
        password: 'hashedPassword',
      });
      mockUserRepository.save.mockResolvedValue({
        id: 'uuid-1234',
        email: registerDto.email,
        username: registerDto.username,
      });
      mockJwtService.sign.mockReturnValue('mock-token');
      mockRefreshTokenRepository.create.mockReturnValue({});
      mockRefreshTokenRepository.save.mockResolvedValue({});

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresAt');
      expect(mockUserRepository.findOne).toHaveBeenCalledTimes(2); // email, username
    });

    it('이미 존재하는 이메일로 가입 시 에러를 던져야 한다', async () => {
      mockUserRepository.findOne.mockResolvedValueOnce({ email: registerDto.email });

      await expect(service.register(registerDto)).rejects.toThrow(
        '이미 사용 중인 이메일입니다.',
      );
    });

    it('이미 존재하는 사용자명으로 가입 시 에러를 던져야 한다', async () => {
      mockUserRepository.findOne
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce({ username: registerDto.username }); // username check

      await expect(service.register(registerDto)).rejects.toThrow(
        '이미 사용 중인 사용자명입니다.',
      );
    });
  });

  describe('로그인 (login)', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockUser = {
      id: 'uuid-1234',
      email: 'test@example.com',
      password: '$2a$10$hashedpassword', // bcrypt hashed
      username: 'testuser',
      loginCount: 0,
    };

    it('올바른 자격증명으로 로그인 시 토큰을 반환해야 한다', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('mock-token');
      mockRefreshTokenRepository.create.mockReturnValue({});
      mockRefreshTokenRepository.save.mockResolvedValue({});
      mockUserRepository.update.mockResolvedValue({});

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresAt');
      expect(mockUserRepository.update).toHaveBeenCalled(); // loginCount, lastLoginAt 업데이트
    });

    it('존재하지 않는 이메일로 로그인 시 에러를 던져야 한다', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    });

    it('잘못된 비밀번호로 로그인 시 에러를 던져야 한다', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        '이메일 또는 비밀번호가 올바르지 않습니다.',
      );
    });
  });

  describe('토큰 갱신 (refreshAccessToken)', () => {
    const mockRefreshToken = {
      id: 'token-uuid',
      token: 'valid-refresh-token',
      userId: 'user-uuid',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일 후
      isRevoked: false,
      user: {
        id: 'user-uuid',
        email: 'test@example.com',
        username: 'testuser',
      },
    };

    it('유효한 리프레시 토큰으로 새 액세스 토큰을 발급해야 한다', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(mockRefreshToken);
      mockJwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshAccessToken('valid-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('expiresAt');
    });

    it('존재하지 않는 리프레시 토큰으로 갱신 시 에러를 던져야 한다', async () => {
      mockRefreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(
        service.refreshAccessToken('invalid-refresh-token'),
      ).rejects.toThrow('유효하지 않은 리프레시 토큰입니다.');
    });

    it('만료된 리프레시 토큰으로 갱신 시 에러를 던져야 한다', async () => {
      const expiredToken = {
        ...mockRefreshToken,
        expiresAt: new Date(Date.now() - 1000), // 과거
      };
      mockRefreshTokenRepository.findOne.mockResolvedValue(expiredToken);

      await expect(
        service.refreshAccessToken('expired-refresh-token'),
      ).rejects.toThrow('만료된 리프레시 토큰입니다.');
    });

    it('폐기된 리프레시 토큰으로 갱신 시 에러를 던져야 한다', async () => {
      const revokedToken = {
        ...mockRefreshToken,
        isRevoked: true,
      };
      mockRefreshTokenRepository.findOne.mockResolvedValue(revokedToken);

      await expect(
        service.refreshAccessToken('revoked-refresh-token'),
      ).rejects.toThrow('폐기된 리프레시 토큰입니다.');
    });
  });

  describe('로그아웃 (logout)', () => {
    it('리프레시 토큰을 폐기해야 한다', async () => {
      mockRefreshTokenRepository.update.mockResolvedValue({ affected: 1 });

      await service.logout('refresh-token-to-revoke');

      expect(mockRefreshTokenRepository.update).toHaveBeenCalledWith(
        { token: 'refresh-token-to-revoke' },
        { isRevoked: true },
      );
    });
  });
});
