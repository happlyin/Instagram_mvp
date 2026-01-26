'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface FollowStatus {
  isFollowedByMe: boolean;
  isFollowingMe: boolean;
}

interface FollowUser {
  id: string;
  username: string;
  profileImageUrl: string | null;
  followStatus: FollowStatus;
  followedAt: string;
}

interface PaginatedFollowList {
  users: FollowUser[];
  hasMore: boolean;
  nextCursor: string | null;
}

interface AdminFollowListPageProps {
  type: 'followers' | 'following';
  username: string;
}

const API_BASE_URL = 'http://localhost:4000/api';

export default function AdminFollowListPage({ type, username }: AdminFollowListPageProps) {
  const router = useRouter();

  const [users, setUsers] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
  }, []);

  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    let response = await fetch(url, {
      ...options,
      credentials: 'include',
    });

    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await fetch(url, {
          ...options,
          credentials: 'include',
        });
      } else {
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiresAt');
        router.push('/');
        throw new Error('인증이 만료되었습니다.');
      }
    }

    return response;
  }, [refreshAccessToken, router]);

  // 관리자 권한 체크
  useEffect(() => {
    const checkAdmin = async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        router.push('/');
        return;
      }

      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/auth/verify`);
        if (!response.ok) {
          router.push('/');
          return;
        }

        const data = await response.json();
        if (data.user.role !== 'admin') {
          router.push('/main');
          return;
        }

        setIsAdmin(true);
      } catch {
        router.push('/');
      }
    };

    checkAdmin();
  }, [authenticatedFetch, router]);

  // 목록 로드
  const fetchUsers = useCallback(async (cursor?: string | null) => {
    if (!isAdmin) return;

    if (cursor) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      let url = `${API_BASE_URL}/users/${username}/${type}?limit=20`;
      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
      }

      const response = await authenticatedFetch(url);
      if (response.ok) {
        const data: PaginatedFollowList = await response.json();
        if (cursor) {
          setUsers((prev) => [...prev, ...data.users]);
        } else {
          setUsers(data.users);
        }
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      }
    } catch {
      // 에러 처리
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [username, type, authenticatedFetch, isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  // 무한 스크롤
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !isLoadingMore) {
        fetchUsers(nextCursor);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore, nextCursor, fetchUsers]);

  const title = type === 'followers' ? '팔로워' : '팔로잉';

  if (!isAdmin || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
          <button onClick={() => router.back()} className="mr-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">{title}</h1>
          <span className="ml-auto text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
            View Only
          </span>
        </div>
      </header>

      {/* 목록 */}
      <div ref={scrollContainerRef} className="pt-14 flex-1 overflow-y-auto max-w-lg mx-auto w-full">
        {users.length === 0 && !isLoading && (
          <div className="p-8 text-center text-gray-500">
            {type === 'followers' ? '팔로워가 없습니다.' : '팔로잉이 없습니다.'}
          </div>
        )}

        {users.map((user) => (
          <div key={user.id} className="flex items-center px-4 py-3">
            {/* 프로필 이미지 */}
            <div
              onClick={() => router.push(`/admin/profile/${user.username}`)}
              className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 ${
                !user.profileImageUrl ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''
              }`}
            >
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-sm font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            {/* 유저명 */}
            <span
              onClick={() => router.push(`/admin/profile/${user.username}`)}
              className="ml-3 font-semibold text-sm cursor-pointer hover:underline flex-1"
            >
              {user.username}
            </span>

            {/* 팔로우 버튼 - 관리자 모드에서는 숨김 */}
            {/* 팔로우 상태 표시 (읽기 전용) */}
            <span className="px-3 py-1.5 text-xs text-gray-400">
              {user.followStatus.isFollowedByMe ? '팔로잉 중' : ''}
            </span>
          </div>
        ))}

        {isLoadingMore && (
          <div className="p-4 text-center">
            <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
