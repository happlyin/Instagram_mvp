'use client';

import { useState, useEffect, useCallback } from 'react';
import MetricCard from './MetricCard';
import DateRangeSelector from './DateRangeSelector';
import DashboardChart, { MetricType, DAUType } from './DashboardChart';

const API_BASE_URL = 'http://localhost:4000/api';

interface DashboardSummary {
  totalUsers: number;
  newUsers: number;
  totalPosts: number;
  newPosts: number;
  retentionRate: number;
  activeUsers: number;
  retainedUsers: number;
}

interface DailyDataPoint {
  date: string;
  cumulativeUsers: number;
  newUsers: number;
  cumulativePosts: number;
  newPosts: number;
  dau: number;
}

interface DashboardData {
  summary: DashboardSummary;
  dailyData: DailyDataPoint[];
  meta: {
    startDate: string;
    endDate: string;
    dauType: DAUType;
  };
}

interface DashboardProps {
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

// 로컬 타임존 기준 날짜 포맷 (KST)
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Dashboard({ authenticatedFetch }: DashboardProps) {
  const today = formatLocalDate(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [dauType, setDauType] = useState<DAUType>('login');
  const [metricType, setMetricType] = useState<MetricType>('totalUsers');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authenticatedFetch(
        `${API_BASE_URL}/admin/dashboard?startDate=${startDate}&endDate=${endDate}&dauType=${dauType}`,
      );

      if (response.ok) {
        const data: DashboardData = await response.json();
        setDashboardData(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || '데이터를 불러오는데 실패했습니다.');
      }
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
      setError('데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [authenticatedFetch, startDate, endDate, dauType]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const metricOptions: { value: MetricType; label: string }[] = [
    { value: 'totalUsers', label: '총 가입자 / 신규 가입자' },
    { value: 'totalPosts', label: '총 게시물 / 신규 게시물' },
    { value: 'retention', label: 'DAU' },
  ];

  const dauOptions: { value: DAUType; label: string }[] = [
    { value: 'login', label: '로그인 기준' },
    { value: 'activity', label: '활동 기준' },
  ];

  if (isLoading) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
        로딩 중...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-center text-red-500">
        {error}
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
        데이터가 없습니다.
      </div>
    );
  }

  const { summary, dailyData } = dashboardData;

  return (
    <div className="space-y-6">
      {/* 날짜 범위 선택 */}
      <div className="bg-white p-4 rounded-lg shadow">
        <DateRangeSelector
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
        />
      </div>

      {/* 요약 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="총 가입자"
          value={summary.totalUsers}
          subValue={`기간 내 신규: ${summary.newUsers.toLocaleString()}명`}
          color="blue"
        />
        <MetricCard
          title="총 게시물"
          value={summary.totalPosts}
          subValue={`기간 내 신규: ${summary.newPosts.toLocaleString()}개`}
          color="green"
        />
        <MetricCard
          title="재접속율"
          value={`${summary.retentionRate}%`}
          subValue={`활성 ${summary.activeUsers}명 중 ${summary.retainedUsers}명`}
          color="purple"
        />
      </div>

      {/* 차트 */}
      <div className="bg-white p-6 rounded-lg shadow">
        {/* 차트 컨트롤 */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label htmlFor="metricType" className="text-sm font-medium text-gray-700">
              지표 선택
            </label>
            <select
              id="metricType"
              value={metricType}
              onChange={(e) => setMetricType(e.target.value as MetricType)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {metricOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="dauType" className="text-sm font-medium text-gray-700">
              DAU 기준
            </label>
            <select
              id="dauType"
              value={dauType}
              onChange={(e) => setDauType(e.target.value as DAUType)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {dauOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 차트 */}
        {dailyData.length > 0 ? (
          <DashboardChart
            dailyData={dailyData}
            metricType={metricType}
            dauType={dauType}
          />
        ) : (
          <div className="h-[400px] flex items-center justify-center text-gray-500">
            선택한 기간에 데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
