import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력해주세요.' })
  email: string;

  @IsString()
  @MinLength(8, { message: '비밀번호는 최소 8자 이상이어야 합니다.' })
  @MaxLength(20, { message: '비밀번호는 최대 20자까지 가능합니다.' })
  password: string;

  @IsString()
  @MinLength(2, { message: '사용자명은 최소 2자 이상이어야 합니다.' })
  @MaxLength(20, { message: '사용자명은 최대 20자까지 가능합니다.' })
  username: string;
}
