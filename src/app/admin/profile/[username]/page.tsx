'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface ProfileData {
  id: string;
  username: string;
  profileImageUrl: string | null;
  postCount: number;
  followerCount: number;
  followingCount: number;
  isFollowedByMe: boolean;
  isFollowingMe: boolean;
}

interface PostImage {
  id: string;
  imageUrl: string;
  orderIndex: number;
}

interface PostItem {
  id: string;
  images: PostImage[];
  likeCount: number;
  isLikedByMe: boolean;
  commentCount: number;
  createdAt: string;
}

interface PaginatedPostsResponse {
  posts: PostItem[];
  hasMore: boolean;
  nextCursor: string | null;
}

const API_BASE_URL = 'http://localhost:4000/api';

export default function AdminProfilePage() {
  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPostsLoading, setIsPostsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

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
          // 일반 사용자는 메인 페이지로 리다이렉트
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

  // 프로필 정보 가져오기
  const fetchProfile = useCallback(async () => {
    if (!isAdmin) return;

    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/profile/${username}`);
      if (response.ok) {
        const data: ProfileData = await response.json();
        setProfile(data);
      }
    } catch {
      // 에러 무시
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, username, isAdmin]);

  // 게시물 가져오기
  const fetchPosts = useCallback(async (cursor?: string | null) => {
    if (isPostsLoading || !profile) return;

    setIsPostsLoading(true);
    try {
      const url = cursor
        ? `${API_BASE_URL}/posts?userId=${profile.id}&limit=12&cursor=${encodeURIComponent(cursor)}`
        : `${API_BASE_URL}/posts?userId=${profile.id}&limit=12`;

      const response = await authenticatedFetch(url);
      if (response.ok) {
        const data: PaginatedPostsResponse = await response.json();
        setPosts((prev) => cursor ? [...prev, ...data.posts] : data.posts);
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      }
    } catch {
      // 에러 무시
    } finally {
      setIsPostsLoading(false);
    }
  }, [authenticatedFetch, isPostsLoading, profile]);

  useEffect(() => {
    if (isAdmin) {
      fetchProfile();
    }
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (profile) {
      fetchPosts();
    }
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 무한 스크롤
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!hasMore || isPostsLoading) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight - 200 && nextCursor) {
        fetchPosts(nextCursor);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isPostsLoading, nextCursor, fetchPosts]);

  if (!isAdmin || isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
            <button onClick={() => router.back()} className="mr-4">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">프로필</h1>
            <span className="ml-auto text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
              View Only
            </span>
          </div>
        </header>
        <div className="pt-14 flex-1 flex items-center justify-center">
          <p className="text-gray-500">유저를 찾을 수 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="min-h-screen bg-white overflow-y-auto">
      {/* 헤더 */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center">
          <button onClick={() => router.back()} className="mr-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">{profile.username}</h1>
          <span className="ml-auto text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
            View Only
          </span>
        </div>
      </header>

      <div className="pt-14 max-w-lg mx-auto">
        {/* 프로필 정보 */}
        <div className="flex items-center px-4 py-6">
          {/* 프로필 이미지 */}
          <div
            className={`w-20 h-20 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ${
              !profile.profileImageUrl ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''
            }`}
          >
            {profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt={profile.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-2xl font-semibold">
                {profile.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* 유저 정보 */}
          <div className="ml-6 flex-1">
            <p className="text-sm font-semibold text-gray-600 mb-2">{profile.username}</p>
            <div className="flex gap-4">
              <div className="text-center">
                <p className="font-semibold text-sm">{profile.postCount}</p>
                <p className="text-xs text-gray-500">게시물</p>
              </div>
              <div
                className="text-center cursor-pointer hover:opacity-70"
                onClick={() => router.push(`/admin/profile/${username}/followers`)}
              >
                <p className="font-semibold text-sm">{profile.followerCount}</p>
                <p className="text-xs text-gray-500">팔로워</p>
              </div>
              <div
                className="text-center cursor-pointer hover:opacity-70"
                onClick={() => router.push(`/admin/profile/${username}/following`)}
              >
                <p className="font-semibold text-sm">{profile.followingCount}</p>
                <p className="text-xs text-gray-500">팔로잉</p>
              </div>
            </div>
          </div>
        </div>

        {/* 팔로우 버튼 - 관리자 모드에서는 숨김 */}
        {/* 구분선 */}
        <div className="border-t border-gray-200" />

        {/* 게시물 그리드 */}
        <div className="grid grid-cols-3 gap-0.5 p-0.5">
          {posts.map((post) => (
            <div key={post.id} className="bg-white">
              {/* 이미지 */}
              <div
                className="aspect-square bg-gray-100 overflow-hidden cursor-pointer hover:opacity-80"
                onClick={() => router.push(`/admin/post/${post.id}`)}
              >
                {post.images.length > 0 ? (
                  <img
                    src={post.images[0].imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    이미지 없음
                  </div>
                )}
              </div>

              {/* 좋아요/댓글 (읽기 전용 - 비활성화) */}
              <div className="flex items-center px-1.5 py-1 gap-2">
                {/* 좋아요 (비활성화) */}
                <div className="flex items-center gap-0.5 text-gray-400 cursor-not-allowed">
                  {post.isLikedByMe ? (
                    <svg className="w-4 h-4 text-red-300" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  )}
                  <span className="text-xs">{post.likeCount}</span>
                </div>

                {/* 댓글 (비활성화) */}
                <div className="flex items-center gap-0.5 text-gray-400 cursor-not-allowed">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                  </svg>
                  <span className="text-xs">{post.commentCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* 게시물 없을 때 */}
        {posts.length === 0 && !isPostsLoading && (
          <div className="p-8 text-center text-gray-500">
            아직 게시물이 없습니다.
          </div>
        )}

        {/* 로딩 인디케이터 */}
        {isPostsLoading && (
          <div className="p-4 text-center">
            <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* 관리자 보기 안내 */}
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 text-center text-sm text-gray-500">
          관리자 모드에서는 프로필을 확인만 할 수 있습니다.
        </div>
      </div>
    </div>
  );
}
