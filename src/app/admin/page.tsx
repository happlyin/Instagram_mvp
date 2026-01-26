'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Dashboard from './components/Dashboard';

const API_BASE_URL = 'http://localhost:4000/api';

type Tab = 'users' | 'posts' | 'dashboard';
type UserFilter = 'all' | 'suspended' | 'active';
type PostFilter = 'all' | 'reported' | 'deleted';

interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin';
  isSuspended: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PostAuthor {
  id: string;
  username: string;
}

interface PostReport {
  id: string;
  reporter: {
    id: string;
    username: string;
  };
  reason: 'spam' | 'inappropriate_content' | 'hate_speech';
  createdAt: string;
}

interface AdminPost {
  id: string;
  author: PostAuthor;
  firstImageUrl: string | null;
  createdAt: string;
  isDeleted: boolean;
  reportCount: number;
  reports: PostReport[];
}

interface PaginatedPosts {
  posts: AdminPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

function AdminPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const initialTab = (searchParams.get('tab') as Tab) || 'users';
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState<UserFilter>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Posts state
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [postFilter, setPostFilter] = useState<PostFilter>('all');
  const [postPage, setPostPage] = useState(1);
  const [postTotalPages, setPostTotalPages] = useState(1);
  const [postTotal, setPostTotal] = useState(0);
  const [isPostsLoading, setIsPostsLoading] = useState(true);

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
  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
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
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('tokenExpiresAt');
          localStorage.removeItem('userRole');
          router.push('/');
          throw new Error('인증이 만료되었습니다.');
        }
      }

      return response;
    },
    [refreshAccessToken, router],
  );

  // 권한 체크
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
          // 일반 사용자는 메인 페이지로 리다이렉트
          router.push('/main');
          return;
        }

        setIsAuthenticated(true);
      } catch {
        router.push('/');
      }
    };

    checkAuth();
  }, [router, authenticatedFetch]);

  // 사용자 목록 조회
  const fetchUsers = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/admin/users?page=${page}&limit=10&filter=${filter}`,
      );

      if (response.ok) {
        const data: PaginatedUsers = await response.json();
        setUsers(data.users);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, page, filter, authenticatedFetch]);

  useEffect(() => {
    if (activeTab === 'users' && isAuthenticated) {
      fetchUsers();
    }
  }, [activeTab, isAuthenticated, fetchUsers]);

  // 게시물 목록 조회
  const fetchPosts = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsPostsLoading(true);
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/admin/posts?page=${postPage}&limit=10&filter=${postFilter}`,
      );

      if (response.ok) {
        const data: PaginatedPosts = await response.json();
        setPosts(data.posts);
        setPostTotalPages(data.totalPages);
        setPostTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setIsPostsLoading(false);
    }
  }, [isAuthenticated, postPage, postFilter, authenticatedFetch]);

  useEffect(() => {
    if (activeTab === 'posts' && isAuthenticated) {
      fetchPosts();
    }
  }, [activeTab, isAuthenticated, fetchPosts]);

  // 사용자 정지/해제
  const handleSuspendToggle = async (userId: string, isSuspended: boolean) => {
    const endpoint = isSuspended ? 'unsuspend' : 'suspend';
    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/admin/users/${userId}/${endpoint}`,
        { method: 'PATCH' },
      );

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    }
  };

  // 게시물 삭제
  const handleDeletePost = async (postId: string) => {
    if (!confirm('이 게시물을 삭제하시겠습니까?')) return;

    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/admin/posts/${postId}`,
        { method: 'DELETE' },
      );

      if (response.ok) {
        fetchPosts();
      } else {
        const data = await response.json();
        alert(data.message || '삭제 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      alert('삭제 처리 중 오류가 발생했습니다.');
    }
  };

  // 게시물 복원
  const handleRestorePost = async (postId: string) => {
    if (!confirm('이 게시물을 복원하시겠습니까?')) return;

    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/admin/posts/${postId}/restore`,
        { method: 'PATCH' },
      );

      if (response.ok) {
        fetchPosts();
      } else {
        const data = await response.json();
        alert(data.message || '복원 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Failed to restore post:', error);
      alert('복원 처리 중 오류가 발생했습니다.');
    }
  };

  // 신고 해제
  const handleDismissReports = async (postId: string) => {
    if (!confirm('이 게시물의 모든 신고를 해제하시겠습니까?')) return;

    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/admin/posts/${postId}/reports`,
        { method: 'DELETE' },
      );

      if (response.ok) {
        fetchPosts();
      } else {
        const data = await response.json();
        alert(data.message || '신고 해제 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Failed to dismiss reports:', error);
      alert('신고 해제 처리 중 오류가 발생했습니다.');
    }
  };

  // 신고 사유 한글 변환
  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'spam':
        return '스팸';
      case 'inappropriate_content':
        return '부적절한 콘텐츠';
      case 'hate_speech':
        return '혐오 발언';
      default:
        return reason;
    }
  };

  // 탭 변경 핸들러 (URL 쿼리 파라미터 업데이트)
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    router.replace(`/admin?tab=${tab}`, { scroll: false });
  };

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
    localStorage.removeItem('userRole');
    router.push('/');
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">관리자 페이지</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {(['users', 'posts', 'dashboard'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab === 'users'
                  ? '사용자 관리'
                  : tab === 'posts'
                    ? '게시물 관리'
                    : '대시보드'}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {activeTab === 'users' && (
          <div>
            {/* 필터 및 통계 */}
            <div className="mb-4 flex items-center justify-between">
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as UserFilter);
                  setPage(1);
                }}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">전체</option>
                <option value="suspended">정지된 사용자</option>
                <option value="active">정상 사용자</option>
              </select>
              <span className="text-sm text-gray-600">총 {total}명</span>
            </div>

            {/* 사용자 테이블 */}
            {isLoading ? (
              <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                로딩 중...
              </div>
            ) : users.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                사용자가 없습니다.
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        이메일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        사용자명
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        권한
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        가입일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        최근 접속
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        액션
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {user.role === 'admin' ? '관리자' : '사용자'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.isSuspended
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {user.isSuspended ? '정지됨' : '정상'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString('ko-KR')
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleSuspendToggle(user.id, user.isSuspended)}
                            disabled={user.role === 'admin'}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                              user.role === 'admin'
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : user.isSuspended
                                  ? 'bg-green-500 text-white hover:bg-green-600'
                                  : 'bg-red-500 text-white hover:bg-red-600'
                            }`}
                          >
                            {user.isSuspended ? '해제' : '정지'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="mt-4 flex justify-center items-center space-x-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <span className="text-sm text-gray-700">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'posts' && (
          <div>
            {/* 필터 및 통계 */}
            <div className="mb-4 flex items-center justify-between">
              <select
                value={postFilter}
                onChange={(e) => {
                  setPostFilter(e.target.value as PostFilter);
                  setPostPage(1);
                }}
                className="border border-gray-300 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">전체 게시물</option>
                <option value="reported">신고된 게시물</option>
                <option value="deleted">삭제된 게시물</option>
              </select>
              <span className="text-sm text-gray-600">총 {postTotal}개</span>
            </div>

            {/* 게시물 테이블 */}
            {isPostsLoading ? (
              <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                로딩 중...
              </div>
            ) : posts.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
                게시물이 없습니다.
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        이미지
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작성자
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        작성일
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        상태
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        신고 정보
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        액션
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {posts.map((post) => (
                      <tr key={post.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {post.firstImageUrl ? (
                            <img
                              src={post.firstImageUrl}
                              alt=""
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                              없음
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {post.author.username}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(post.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              post.isDeleted
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {post.isDeleted ? '삭제됨' : '정상'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {post.reportCount > 0 ? (
                            <div className="text-sm">
                              <span className="font-semibold text-red-600">
                                {post.reportCount}건
                              </span>
                              <div className="mt-1 max-h-20 overflow-y-auto">
                                {post.reports.slice(0, 3).map((report) => (
                                  <div
                                    key={report.id}
                                    className="text-xs text-gray-500 mb-1"
                                  >
                                    <span className="font-medium">
                                      {report.reporter.username}
                                    </span>
                                    {' - '}
                                    <span className="text-red-500">
                                      {getReasonLabel(report.reason)}
                                    </span>
                                    <br />
                                    <span className="text-gray-400">
                                      {new Date(report.createdAt).toLocaleDateString(
                                        'ko-KR',
                                      )}
                                    </span>
                                  </div>
                                ))}
                                {post.reports.length > 3 && (
                                  <div className="text-xs text-gray-400">
                                    ... 외 {post.reports.length - 3}건
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">없음</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/admin/post/${post.id}`)}
                              className="px-3 py-1.5 text-sm font-medium rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                            >
                              조회
                            </button>
                            {post.reportCount > 0 && (
                              <button
                                onClick={() => handleDismissReports(post.id)}
                                className="px-3 py-1.5 text-sm font-medium rounded-md bg-yellow-500 text-white hover:bg-yellow-600 transition-colors"
                              >
                                신고 해제
                              </button>
                            )}
                            {post.isDeleted ? (
                              <button
                                onClick={() => handleRestorePost(post.id)}
                                className="px-3 py-1.5 text-sm font-medium rounded-md bg-green-500 text-white hover:bg-green-600 transition-colors"
                              >
                                복구
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeletePost(post.id)}
                                className="px-3 py-1.5 text-sm font-medium rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                              >
                                삭제
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 페이지네이션 */}
            {postTotalPages > 1 && (
              <div className="mt-4 flex justify-center items-center space-x-4">
                <button
                  onClick={() => setPostPage((p) => Math.max(1, p - 1))}
                  disabled={postPage === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                <span className="text-sm text-gray-700">
                  {postPage} / {postTotalPages}
                </span>
                <button
                  onClick={() => setPostPage((p) => Math.min(postTotalPages, p + 1))}
                  disabled={postPage === postTotalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <Dashboard authenticatedFetch={authenticatedFetch} />
        )}
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-100 flex items-center justify-center">
          <p className="text-gray-500">로딩 중...</p>
        </main>
      }
    >
      <AdminPageContent />
    </Suspense>
  );
}
