'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:4000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, username }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || '회원가입에 실패했습니다.');
        return;
      }

      // 회원가입 성공 상태로 변경
      setIsSuccess(true);
    } catch (err) {
      setError('회원가입에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 회원가입 성공 화면
  if (isSuccess) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="bg-white p-8 border border-gray-300 rounded-lg text-center">
            <div className="text-green-500 mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              회원가입 성공!
            </h2>
            <p className="text-gray-600 mb-6">
              회원가입이 완료되었습니다.<br />
              로그인하여 Instagram을 시작하세요.
            </p>
            <button
              onClick={() => router.push('/')}
              className="w-full py-2 bg-instagram-blue hover:bg-blue-600 text-white font-semibold rounded-md transition-colors"
            >
              로그인 화면으로 이동
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* 뒤로가기 버튼 */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm">뒤로가기</span>
          </Link>
        </div>

        {/* 로고 */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-instagram-purple via-instagram-primary to-instagram-gradient-start bg-clip-text text-transparent">
            Instagram
          </h1>
          <p className="text-gray-500 mt-2">친구들의 사진과 동영상을 보려면 가입하세요.</p>
        </div>

        {/* 회원가입 폼 */}
        <div className="bg-white p-8 border border-gray-300 rounded-lg">
          {/* 에러 메시지 */}
          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* 이메일 입력 */}
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md bg-gray-50 text-sm focus:outline-none focus:border-gray-400 placeholder-gray-500"
              required
            />

            {/* 사용자명 입력 */}
            <input
              type="text"
              placeholder="사용자명 (닉네임)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md bg-gray-50 text-sm focus:outline-none focus:border-gray-400 placeholder-gray-500"
              required
            />

            {/* 비밀번호 입력 */}
            <input
              type="password"
              placeholder="비밀번호 (8자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-md bg-gray-50 text-sm focus:outline-none focus:border-gray-400 placeholder-gray-500"
              minLength={8}
              required
            />

            {/* 회원가입 버튼 */}
            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={isLoading || !email || !password || !username}
                className="w-[70%] py-2 bg-instagram-blue hover:bg-blue-600 text-white font-semibold rounded-md transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {isLoading ? '가입 중...' : '가입하기'}
              </button>
            </div>
          </form>
        </div>

        {/* 로그인 링크 */}
        <div className="bg-white p-4 border border-gray-300 rounded-lg mt-4 text-center">
          <span className="text-sm text-gray-600">계정이 있으신가요? </span>
          <Link
            href="/"
            className="text-sm text-instagram-blue font-semibold hover:text-instagram-purple transition-colors"
          >
            로그인
          </Link>
        </div>
      </div>
    </main>
  );
}
