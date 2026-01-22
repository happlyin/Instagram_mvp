'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:4000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 쿠키 포함
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError('이메일 또는 비밀번호가 일치하지 않습니다.');
        return;
      }

      // Refresh Token을 로컬스토리지에 저장
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('tokenExpiresAt', data.expiresAt.toString());

      // 메인 페이지로 이동
      router.push('/main');
    } catch (err) {
      setError('이메일 또는 비밀번호가 일치하지 않습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-instagram-purple via-instagram-primary to-instagram-gradient-start bg-clip-text text-transparent pb-1">
            Instagram
          </h1>
        </div>

        {/* 로그인 폼 */}
        <div className="bg-white p-8 border border-gray-300 rounded-lg">
          {/* 에러 메시지 */}
          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}

          {/* 회원가입 링크 */}
          <div className="flex justify-end mb-4">
            <Link
              href="/register"
              className="text-sm text-instagram-blue hover:text-instagram-purple transition-colors"
            >
              회원가입하기
            </Link>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* 이메일 입력 */}
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md bg-gray-50 text-sm focus:outline-none focus:border-gray-400 placeholder-gray-500"
              required
            />

            {/* 비밀번호 입력 */}
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md bg-gray-50 text-sm focus:outline-none focus:border-gray-400 placeholder-gray-500"
              required
            />

            {/* 로그인 버튼 */}
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={isLoading || !email || !password}
                className="w-[70%] py-2 bg-instagram-blue hover:bg-blue-600 text-white font-semibold rounded-md transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
