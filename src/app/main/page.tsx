'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface PostImage {
  id: string;
  imageUrl: string;
  orderIndex: number;
}

interface PostCaption {
  id: string;
  text: string;
  isBold: boolean;
  isItalic: boolean;
  fontSize: number;
}

interface PostAuthor {
  id: string;
  username: string;
  profileImageUrl: string | null;
}

interface Post {
  id: string;
  author: PostAuthor;
  images: PostImage[];
  caption: PostCaption | null;
  likeCount: number;
  isLikedByMe: boolean;
  commentCount: number;
  createdAt: string;
}

interface PaginatedResponse {
  posts: Post[];
  hasMore: boolean;
  nextCursor: string | null;
}

const API_BASE_URL = 'http://localhost:4000/api';

export default function MainPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Access Token 갱신 함수
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

  // 인증된 API 요청 함수
  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    let response = await fetch(url, {
      ...options,
      credentials: 'include',
    });

    // 401 에러시 토큰 갱신 시도
    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        response = await fetch(url, {
          ...options,
          credentials: 'include',
        });
      } else {
        // 갱신 실패 - 로그인 페이지로 이동
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('tokenExpiresAt');
        router.push('/');
        throw new Error('인증이 만료되었습니다.');
      }
    }

    return response;
  }, [refreshAccessToken, router]);

  // 피드 목록 조회
  const fetchPosts = useCallback(async (cursor?: string | null) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = cursor
        ? `${API_BASE_URL}/posts?limit=10&cursor=${encodeURIComponent(cursor)}`
        : `${API_BASE_URL}/posts?limit=10`;

      const response = await authenticatedFetch(url);

      if (!response.ok) {
        throw new Error('피드를 불러오는데 실패했습니다.');
      }

      const data: PaginatedResponse = await response.json();

      setPosts((prev) => cursor ? [...prev, ...data.posts] : data.posts);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, isLoading]);

  // 초기 로딩
  useEffect(() => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      router.push('/');
      return;
    }
    setIsAuthenticated(true);
    fetchPosts();

    // 현재 유저 정보 가져오기
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentUsername(data.user.username);
        }
      } catch {
        // 무시
      }
    };
    fetchCurrentUser();
  }, [router]); // fetchPosts는 의도적으로 제외 (초기 1회만 실행)

  // 무한 스크롤 - 7번째 피드 근처에서 다음 데이터 요청
  useEffect(() => {
    if (!containerRef.current) return;

    const handleScroll = () => {
      if (!hasMore || isLoading) return;

      // 전체 피드 중 70% 정도 스크롤 시 다음 로드
      const container = containerRef.current;
      if (!container) return;

      const scrollPosition = window.scrollY + window.innerHeight;
      const threshold = container.scrollHeight * 0.7;

      if (scrollPosition >= threshold && nextCursor) {
        fetchPosts(nextCursor);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, nextCursor, fetchPosts]);

  // 로그아웃
  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');

    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
      });
    } catch (err) {
      console.error('Logout error:', err);
    }

    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tokenExpiresAt');
    router.push('/');
  };

  // 시간 포맷팅
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '방금 전';
    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays < 7) return `${diffDays}일 전`;
    return date.toLocaleDateString('ko-KR');
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
      {/* 헤더 - 상단 고정 */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-300 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-instagram-purple via-instagram-primary to-instagram-gradient-start bg-clip-text text-transparent pb-1">
            Instagram
          </h1>
          <div className="flex items-center gap-3">
            {currentUsername && (
              <button
                onClick={() => router.push(`/profile/${currentUsername}`)}
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                내 프로필
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </header>

      {/* 피드 목록 - 헤더 높이만큼 상단 여백 */}
      <div ref={containerRef} className="max-w-lg mx-auto pt-14">
        {error && (
          <div className="p-4 text-center text-red-500">
            {error}
            <button
              onClick={() => fetchPosts()}
              className="ml-2 text-blue-500 underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {posts.length === 0 && !isLoading && !error && (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-4">아직 피드가 없습니다.</p>
            <Link
              href="/post/create"
              className="inline-block px-6 py-2 bg-instagram-blue text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              첫 피드 작성하기
            </Link>
          </div>
        )}

        {posts.map((post) => (
          <FeedCard
            key={post.id}
            post={post}
            formatTime={formatTime}
            authenticatedFetch={authenticatedFetch}
            onLikeUpdate={(postId, liked, likeCount) => {
              setPosts((prev) =>
                prev.map((p) =>
                  p.id === postId ? { ...p, isLikedByMe: liked, likeCount } : p
                )
              );
            }}
          />
        ))}

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <div className="p-4 text-center">
            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-instagram-blue rounded-full animate-spin" />
          </div>
        )}

        {/* 더 이상 데이터 없음 */}
        {!hasMore && posts.length > 0 && (
          <div className="p-8 text-center text-gray-400">
            모든 피드를 불러왔습니다.
          </div>
        )}
      </div>

      {/* 피드 추가 버튼 (우측 하단 고정) */}
      <Link
        href="/post/create"
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-instagram-purple to-instagram-primary text-white rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow z-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
      </Link>
    </main>
  );
}

// 개별 피드 카드 컴포넌트
function FeedCard({
  post,
  formatTime,
  authenticatedFetch,
  onLikeUpdate,
}: {
  post: Post;
  formatTime: (date: string) => string;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
  onLikeUpdate: (postId: string, liked: boolean, likeCount: number) => void;
}) {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) =>
      prev < post.images.length - 1 ? prev + 1 : prev
    );
  };

  const handleLikeToggle = async () => {
    if (isLikeLoading) return;

    // 낙관적 업데이트
    const newLiked = !post.isLikedByMe;
    const newCount = newLiked ? post.likeCount + 1 : post.likeCount - 1;
    onLikeUpdate(post.id, newLiked, newCount);

    setIsLikeLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/posts/${post.id}/like`,
        { method: 'POST' }
      );

      if (response.ok) {
        const data = await response.json();
        onLikeUpdate(post.id, data.liked, data.likeCount);
      } else {
        // 실패 시 롤백
        onLikeUpdate(post.id, post.isLikedByMe, post.likeCount);
      }
    } catch {
      // 에러 시 롤백
      onLikeUpdate(post.id, post.isLikedByMe, post.likeCount);
    } finally {
      setIsLikeLoading(false);
    }
  };

  const handleCommentClick = () => {
    router.push(`/post/${post.id}/comments`);
  };

  return (
    <article className="bg-white border-b border-gray-200">
      {/* 작성자 정보 */}
      <div className="flex items-center px-4 py-3">
        <div
          onClick={() => router.push(`/profile/${post.author.username}`)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold cursor-pointer overflow-hidden flex-shrink-0"
        >
          {post.author.profileImageUrl ? (
            <img src={post.author.profileImageUrl} alt={post.author.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-instagram-purple to-instagram-primary flex items-center justify-center">
              {post.author.username.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <span
          onClick={() => router.push(`/profile/${post.author.username}`)}
          className="ml-3 font-semibold text-sm cursor-pointer hover:underline"
        >
          {post.author.username}
        </span>
      </div>

      {/* 이미지 캐러셀 */}
      <div className="relative bg-black aspect-square">
        {post.images.length > 0 ? (
          <>
            <img
              src={post.images[currentImageIndex]?.imageUrl}
              alt={`${post.author.username}의 피드 이미지 ${currentImageIndex + 1}`}
              className="w-full h-full object-contain cursor-pointer"
              onClick={() => router.push(`/post/${post.id}`)}
            />

            {/* 이미지 네비게이션 */}
            {post.images.length > 1 && (
              <>
                {currentImageIndex > 0 && (
                  <button
                    onClick={handlePrevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                )}
                {currentImageIndex < post.images.length - 1 && (
                  <button
                    onClick={handleNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center shadow"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}

                {/* 이미지 인디케이터 */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                  {post.images.map((_, idx) => (
                    <span
                      key={idx}
                      className={`w-1.5 h-1.5 rounded-full ${
                        idx === currentImageIndex ? 'bg-instagram-blue' : 'bg-white/60'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            이미지 없음
          </div>
        )}
      </div>

      {/* 좋아요/댓글 아이콘 */}
      <div className="flex items-center px-4 py-2">
        <button
          onClick={handleLikeToggle}
          disabled={isLikeLoading}
          className="flex items-center gap-1 p-1 hover:opacity-60 transition-opacity"
        >
          {post.isLikedByMe ? (
            <svg className="w-7 h-7 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          ) : (
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          )}
          <span className="text-sm font-semibold">{post.likeCount}</span>
        </button>

        <button
          onClick={handleCommentClick}
          className="flex items-center gap-1 p-1 ml-3 hover:opacity-60 transition-opacity"
        >
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
          </svg>
          <span className="text-sm font-semibold">{post.commentCount}</span>
        </button>
      </div>

      {/* 캡션 */}
      <div className="px-4 py-2">
        {post.caption && (
          <p
            style={{
              fontWeight: post.caption.isBold ? 'bold' : 'normal',
              fontStyle: post.caption.isItalic ? 'italic' : 'normal',
              fontSize: `${post.caption.fontSize}px`,
            }}
            className="text-gray-800"
          >
            <span className="font-semibold mr-2">{post.author.username}</span>
            {post.caption.text}
          </p>
        )}

        <p className="text-xs text-gray-400 mt-2">{formatTime(post.createdAt)}</p>
      </div>
    </article>
  );
}
