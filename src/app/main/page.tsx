'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MainPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 로그인 상태 확인
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      router.push('/');
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');

    try {
      await fetch('http://localhost:4000/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
      });
    } catch (err) {
      console.error('Logout error:', err);
    }

    // 로컬스토리지 클리어
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiresAt');

    // 로그인 페이지로 이동
    router.push('/');
  };

  // Access Token 갱신 함수
  const refreshAccessToken = async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await fetch('http://localhost:4000/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('tokenExpiresAt', data.expiresAt.toString());
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleVerifyToken = async () => {
    try {
      // 1차 검증 시도
      let response = await fetch('http://localhost:4000/api/auth/verify', {
        method: 'GET',
        credentials: 'include',
      });

      let data = await response.json();

      // Access Token이 유효하지 않으면 갱신 시도
      if (!response.ok && response.status === 401) {
        alert(`⚠️ Access Token이 만료되었습니다.\n\nRefresh Token으로 갱신을 시도합니다...`);

        const refreshed = await refreshAccessToken();

        if (refreshed) {
          // 갱신 성공 후 재검증
          response = await fetch('http://localhost:4000/api/auth/verify', {
            method: 'GET',
            credentials: 'include',
          });

          data = await response.json();

          if (response.ok) {
            alert(`✅ 토큰 갱신 및 검증 성공!\n\n사용자 정보:\n- ID: ${data.user.userId}\n- 이메일: ${data.user.email}\n- 사용자명: ${data.user.username}`);
            return;
          }
        }

        // 갱신 실패 - 로그인 페이지로 이동
        alert(`❌ 토큰 갱신 실패!\n\nRefresh Token이 만료되었거나 유효하지 않습니다.\n다시 로그인해 주세요.`);
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiresAt');
        router.push('/');
        return;
      }

      if (response.ok) {
        alert(`✅ 토큰 검증 성공!\n\n사용자 정보:\n- ID: ${data.user.userId}\n- 이메일: ${data.user.email}\n- 사용자명: ${data.user.username}`);
      } else {
        alert(`❌ 토큰 검증 실패!\n\n오류: ${data.message}`);
      }
    } catch (err) {
      alert(`❌ 토큰 검증 실패!\n\n네트워크 오류가 발생했습니다.`);
      console.error('Token verification error:', err);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p>로딩 중...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-300 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-instagram-purple via-instagram-primary to-instagram-gradient-start bg-clip-text text-transparent">
            Instagram
          </h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white p-8 rounded-lg border border-gray-300 text-center">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            환영합니다! 🎉
          </h2>
          <p className="text-gray-600 mb-6">
            로그인에 성공했습니다. 이제 Instagram MVP를 사용할 수 있습니다.
          </p>
          <button
            onClick={handleVerifyToken}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Access Token 검증 테스트
          </button>
        </div>
      </div>
    </main>
  );
}
