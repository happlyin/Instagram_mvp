'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

export type MetricType =
  | 'totalUsers'
  | 'newUsers'
  | 'totalPosts'
  | 'newPosts'
  | 'retention';

export type DAUType = 'login' | 'activity';

interface DailyDataPoint {
  date: string;
  cumulativeUsers: number;
  newUsers: number;
  cumulativePosts: number;
  newPosts: number;
  dau: number;
}

interface DashboardChartProps {
  dailyData: DailyDataPoint[];
  metricType: MetricType;
  dauType: DAUType;
}

const metricLabels: Record<MetricType, { cumulative: string; daily: string }> = {
  totalUsers: { cumulative: '누적 가입자', daily: '일별 신규 가입자' },
  newUsers: { cumulative: '누적 가입자', daily: '일별 신규 가입자' },
  totalPosts: { cumulative: '누적 게시물', daily: '일별 신규 게시물' },
  newPosts: { cumulative: '누적 게시물', daily: '일별 신규 게시물' },
  retention: { cumulative: 'DAU', daily: 'DAU' },
};

export default function DashboardChart({
  dailyData,
  metricType,
  dauType,
}: DashboardChartProps) {
  const labels = dailyData.map((d) => d.date);

  const getCumulativeData = () => {
    switch (metricType) {
      case 'totalUsers':
      case 'newUsers':
        return dailyData.map((d) => d.cumulativeUsers);
      case 'totalPosts':
      case 'newPosts':
        return dailyData.map((d) => d.cumulativePosts);
      case 'retention':
        return dailyData.map((d) => d.dau);
    }
  };

  const getDailyData = () => {
    switch (metricType) {
      case 'totalUsers':
      case 'newUsers':
        return dailyData.map((d) => d.newUsers);
      case 'totalPosts':
      case 'newPosts':
        return dailyData.map((d) => d.newPosts);
      case 'retention':
        return dailyData.map((d) => d.dau);
    }
  };

  const chartData = {
    labels,
    datasets:
      metricType === 'retention'
        ? [
            {
              type: 'bar' as const,
              label: `DAU (${dauType === 'login' ? '로그인 기준' : '활동 기준'})`,
              data: getDailyData(),
              backgroundColor: 'rgba(139, 92, 246, 0.5)',
              borderColor: 'rgb(139, 92, 246)',
              borderWidth: 1,
            },
          ]
        : [
            {
              type: 'line' as const,
              label: metricLabels[metricType].cumulative,
              data: getCumulativeData(),
              borderColor: 'rgb(59, 130, 246)',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              tension: 0.3,
              yAxisID: 'y',
            },
            {
              type: 'bar' as const,
              label: metricLabels[metricType].daily,
              data: getDailyData(),
              backgroundColor: 'rgba(34, 197, 94, 0.5)',
              borderColor: 'rgb(34, 197, 94)',
              borderWidth: 1,
              yAxisID: 'y1',
            },
          ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales:
      metricType === 'retention'
        ? {
            y: {
              type: 'linear' as const,
              display: true,
              position: 'left' as const,
              beginAtZero: true,
              title: {
                display: true,
                text: 'DAU',
              },
            },
          }
        : {
            y: {
              type: 'linear' as const,
              display: true,
              position: 'left' as const,
              beginAtZero: true,
              title: {
                display: true,
                text: metricLabels[metricType].cumulative,
              },
            },
            y1: {
              type: 'linear' as const,
              display: true,
              position: 'right' as const,
              beginAtZero: true,
              grid: {
                drawOnChartArea: false,
              },
              title: {
                display: true,
                text: metricLabels[metricType].daily,
              },
            },
          },
  };

  return (
    <div className="w-full h-[400px]">
      <Chart type="bar" data={chartData} options={options} />
    </div>
  );
}
