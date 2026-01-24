'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';

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

export default function CommentsPage() {
  const router = useRouter();
  const params = useParams();
  const postId = params.id as string;

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

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

  // 현재 유저 정보 조회
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await authenticatedFetch(`${API_BASE_URL}/auth/verify`);
        if (response.ok) {
          const data = await response.json();
          setCurrentUserId(data.user.userId);
        }
      } catch {
        // 인증 실패 시 로그인 페이지로 이동 (authenticatedFetch에서 처리)
      }
    };

    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      router.push('/');
      return;
    }

    fetchCurrentUser();
  }, [authenticatedFetch, router]);

  // 댓글 목록 조회
  const fetchComments = useCallback(async (cursor?: string | null) => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const url = cursor
        ? `${API_BASE_URL}/posts/${postId}/comments?limit=20&cursor=${encodeURIComponent(cursor)}`
        : `${API_BASE_URL}/posts/${postId}/comments?limit=20`;

      const response = await authenticatedFetch(url);

      if (!response.ok) {
        throw new Error('댓글을 불러오는데 실패했습니다.');
      }

      const data: PaginatedCommentsResponse = await response.json();

      setComments((prev) => cursor ? [...prev, ...data.comments] : data.comments);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, isLoading, postId]);

  // 초기 로딩
  useEffect(() => {
    fetchComments();
  }, [postId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 무한 스크롤
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!hasMore || isLoading) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollTop + clientHeight >= scrollHeight - 100 && nextCursor) {
        fetchComments(nextCursor);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoading, nextCursor, fetchComments]);

  // 댓글 작성
  const handleSubmitComment = async () => {
    if (!newCommentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/posts/${postId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: newCommentText.trim() }),
        }
      );

      if (response.ok) {
        const newComment: Comment = await response.json();
        setComments((prev) => [newComment, ...prev]);
        setNewCommentText('');
      }
    } catch {
      // 에러 무시
    } finally {
      setIsSubmitting(false);
    }
  };

  // 댓글 삭제
  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/comments/${commentId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch {
      // 에러 무시
    }
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
          <h1 className="text-lg font-semibold">댓글</h1>
        </div>
      </header>

      {/* 댓글 목록 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pt-14 pb-16 max-w-lg mx-auto w-full"
      >
        {error && (
          <div className="p-4 text-center text-red-500">
            {error}
            <button
              onClick={() => fetchComments()}
              className="ml-2 text-blue-500 underline"
            >
              다시 시도
            </button>
          </div>
        )}

        {comments.length === 0 && !isLoading && !error && (
          <div className="p-8 text-center text-gray-500">
            아직 댓글이 없습니다. 첫 댓글을 남겨보세요!
          </div>
        )}

        {comments.map((comment) => (
          <div key={comment.id} className="flex items-start px-4 py-3">
            {/* 프로필 아이콘 */}
            <div
              onClick={() => router.push(`/profile/${comment.author.username}`)}
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden ${
                !comment.author.profileImageUrl ? 'bg-gradient-to-r from-instagram-purple to-instagram-primary' : ''
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

            {/* 댓글 내용 */}
            <div className="ml-3 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  onClick={() => router.push(`/profile/${comment.author.username}`)}
                  className="font-semibold text-sm cursor-pointer hover:underline"
                >
                  {comment.author.username}
                </span>
                <span className="text-xs text-gray-400">{formatTime(comment.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-800 mt-0.5 break-words">{comment.text}</p>
            </div>

            {/* 삭제 버튼 (본인 댓글만) */}
            {currentUserId === comment.author.id && (
              <button
                onClick={() => handleDeleteComment(comment.id)}
                className="ml-2 p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}

        {/* 로딩 인디케이터 */}
        {isLoading && (
          <div className="p-4 text-center">
            <div className="inline-block w-5 h-5 border-2 border-gray-300 border-t-instagram-blue rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* 하단 고정: 댓글 입력 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto px-4 py-2 flex items-center gap-2">
          <input
            type="text"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
            placeholder="댓글 달기..."
            maxLength={500}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-instagram-blue"
          />
          <button
            onClick={handleSubmitComment}
            disabled={!newCommentText.trim() || isSubmitting}
            className="text-sm font-semibold text-instagram-blue disabled:opacity-40 px-3 py-2"
          >
            게시
          </button>
        </div>
      </div>
    </div>
  );
}
