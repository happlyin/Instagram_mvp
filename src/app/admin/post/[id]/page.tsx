'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface PostAuthor {
  id: string;
  username: string;
  profileImageUrl: string | null;
}

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

interface PostData {
  id: string;
  author: PostAuthor;
  images: PostImage[];
  caption: PostCaption | null;
  likeCount: number;
  commentCount: number;
  createdAt: string;
}

interface CommentAuthor {
  id: string;
  username: string;
  profileImageUrl: string | null;
}

interface Comment {
  id: string;
  text: string;
  author: CommentAuthor;
  createdAt: string;
}

interface PaginatedCommentsResponse {
  comments: Comment[];
  hasMore: boolean;
  nextCursor: string | null;
}

const API_BASE_URL = 'http://localhost:4000/api';

export default function AdminPostDetailPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [post, setPost] = useState<PostData | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [comments, setComments] = useState<Comment[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const commentsContainerRef = useRef<HTMLDivElement>(null);

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

  // 권한 체크 (관리자만)
  useEffect(() => {
    const checkAuth = async () => {
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
      } catch {
        router.push('/');
      }
    };

    checkAuth();
  }, [authenticatedFetch, router]);

  // 포스트 조회
  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/posts/${postId}`);
        if (response.ok) {
          const data: PostData = await response.json();
          setPost(data);
        }
      } catch {
        // 에러 무시
      }
    };

    fetchPost();
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 댓글 조회
  const fetchComments = useCallback(async (cursor?: string | null) => {
    if (isCommentsLoading) return;

    setIsCommentsLoading(true);
    try {
      const url = cursor
        ? `${API_BASE_URL}/posts/${postId}/comments?limit=20&cursor=${encodeURIComponent(cursor)}`
        : `${API_BASE_URL}/posts/${postId}/comments?limit=20`;

      const response = await authenticatedFetch(url);
      if (response.ok) {
        const data: PaginatedCommentsResponse = await response.json();
        setComments((prev) => cursor ? [...prev, ...data.comments] : data.comments);
        setHasMore(data.hasMore);
        setNextCursor(data.nextCursor);
      }
    } catch {
      // 에러 무시
    } finally {
      setIsCommentsLoading(false);
    }
  }, [authenticatedFetch, isCommentsLoading, postId]);

  useEffect(() => {
    fetchComments();
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 댓글 무한 스크롤
  useEffect(() => {
    const container = commentsContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!hasMore || isCommentsLoading) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight - 100 && nextCursor) {
        fetchComments(nextCursor);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isCommentsLoading, nextCursor, fetchComments]);

  // 이미지 네비게이션
  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNextImage = () => {
    if (!post) return;
    setCurrentImageIndex((prev) => (prev < post.images.length - 1 ? prev + 1 : prev));
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

  if (!post) {
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
          <h1 className="text-lg font-semibold">게시물 (관리자 보기)</h1>
          <span className="ml-auto text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
            View Only
          </span>
        </div>
      </header>

      <div className="pt-14 flex flex-col max-w-lg mx-auto w-full" style={{ height: 'calc(100vh - 56px)' }}>
        {/* 피드 영역 */}
        <div className="flex-shrink-0 border-b border-gray-200">
          {/* 작성자 정보 */}
          <div className="flex items-center px-4 py-3 border-b border-gray-200">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${
                !post.author.profileImageUrl ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''
              }`}
            >
              {post.author.profileImageUrl ? (
                <img src={post.author.profileImageUrl} alt={post.author.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-sm font-semibold">
                  {post.author.username.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="ml-3 font-semibold text-sm">
              {post.author.username}
            </span>
            <span className="ml-2 text-xs text-gray-400">{formatTime(post.createdAt)}</span>
          </div>

          {/* 이미지 */}
          <div className="relative bg-black aspect-square flex items-center justify-center">
            {post.images.length > 0 ? (
              <>
                <img
                  src={post.images[currentImageIndex]?.imageUrl}
                  alt=""
                  className="max-w-full max-h-full object-contain"
                />

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

                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                      {post.images.map((_, idx) => (
                        <span
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${
                            idx === currentImageIndex ? 'bg-blue-500' : 'bg-white/60'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="text-gray-400">이미지 없음</div>
            )}
          </div>

          {/* 좋아요/댓글 수 (읽기 전용) - [신고(비활성)] ... [좋아요] [댓글] 레이아웃 */}
          <div className="px-4 py-2">
            <div className="flex items-center justify-between">
              {/* 왼쪽: 신고 아이콘 (비활성화) */}
              <div className="p-1 text-gray-300 cursor-not-allowed" title="관리자 모드에서는 신고할 수 없습니다">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" />
                </svg>
              </div>

              {/* 오른쪽: 좋아요, 댓글 */}
              <div className="flex items-center gap-4 text-gray-600">
                <div className="flex items-center gap-1">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                  </svg>
                  <span className="text-sm">{post.likeCount}</span>
                </div>

                <div className="flex items-center gap-1">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
                  </svg>
                  <span className="text-sm">{post.commentCount}</span>
                </div>
              </div>
            </div>

            {post.caption && (
              <p
                className="mt-2 text-sm text-gray-800"
                style={{
                  fontWeight: post.caption.isBold ? 'bold' : 'normal',
                  fontStyle: post.caption.isItalic ? 'italic' : 'normal',
                  fontSize: `${post.caption.fontSize}px`,
                }}
              >
                <span className="font-semibold mr-2">{post.author.username}</span>
                {post.caption.text}
              </p>
            )}
          </div>
        </div>

        {/* 댓글 영역 (읽기 전용) */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* 댓글 목록 */}
          <div ref={commentsContainerRef} className="flex-1 overflow-y-auto">
            {comments.length === 0 && !isCommentsLoading && (
              <div className="p-4 text-center text-gray-400 text-sm">
                아직 댓글이 없습니다.
              </div>
            )}

            {comments.map((comment) => (
              <div key={comment.id} className="flex items-start px-4 py-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden ${
                    !comment.author.profileImageUrl ? 'bg-gradient-to-r from-purple-500 to-pink-500' : ''
                  }`}
                >
                  {comment.author.profileImageUrl ? (
                    <img
                      src={comment.author.profileImageUrl}
                      alt={comment.author.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-xs font-semibold">
                      {comment.author.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="ml-2 flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-xs">
                      {comment.author.username}
                    </span>
                    <span className="text-xs text-gray-400">{formatTime(comment.createdAt)}</span>
                  </div>
                  <p className="text-xs text-gray-800 mt-0.5 break-words">{comment.text}</p>
                </div>
              </div>
            ))}

            {isCommentsLoading && (
              <div className="p-3 text-center">
                <div className="inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* 관리자 보기 안내 */}
          <div className="border-t border-gray-200 px-4 py-3 bg-gray-50 text-center text-sm text-gray-500">
            관리자 모드에서는 게시물을 확인만 할 수 있습니다.
          </div>
        </div>
      </div>
    </div>
  );
}
