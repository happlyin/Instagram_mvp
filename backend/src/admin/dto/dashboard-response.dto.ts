export interface DashboardSummary {
  totalUsers: number;
  newUsers: number;
  totalPosts: number;
  newPosts: number;
  retentionRate: number;
  activeUsers: number;
  retainedUsers: number;
}

export interface DailyDataPoint {
  date: string;
  cumulativeUsers: number;
  newUsers: number;
  cumulativePosts: number;
  newPosts: number;
  dau: number;
}

export interface DashboardMeta {
  startDate: string;
  endDate: string;
  dauType: 'login' | 'activity';
}

export interface DashboardResponse {
  summary: DashboardSummary;
  dailyData: DailyDataPoint[];
  meta: DashboardMeta;
}
