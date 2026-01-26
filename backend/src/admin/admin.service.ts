import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { Report, ReportReason } from '../reports/entities/report.entity';
import { Comment } from '../comments/entities/comment.entity';
import { Like } from '../likes/entities/like.entity';
import { DashboardResponse, DailyDataPoint } from './dto/dashboard-response.dto';

export interface PaginatedUsersResponse {
  users: {
    id: string;
    email: string;
    username: string;
    role: UserRole;
    isSuspended: boolean;
    createdAt: Date;
    lastLoginAt: Date | null;
  }[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminPostDto {
  id: string;
  author: {
    id: string;
    username: string;
  };
  firstImageUrl: string | null;
  createdAt: Date;
  isDeleted: boolean;
  reportCount: number;
  reports: {
    id: string;
    reporter: {
      id: string;
      username: string;
    };
    reason: ReportReason;
    createdAt: Date;
  }[];
}

export interface PaginatedPostsResponse {
  posts: AdminPostDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Post)
    private readonly postRepository: Repository<Post>,
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    @InjectRepository(Like)
    private readonly likeRepository: Repository<Like>,
  ) {}

  /**
   * 사용자 목록 조회 (페이지네이션, 필터링)
   */
  async getUsers(
    page: number,
    limit: number,
    filter: 'all' | 'suspended' | 'active',
  ): Promise<PaginatedUsersResponse> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // 필터 적용
    if (filter === 'suspended') {
      queryBuilder.where('user.isSuspended = :suspended', { suspended: true });
    } else if (filter === 'active') {
      queryBuilder.where('user.isSuspended = :suspended', { suspended: false });
    }

    // 전체 개수 조회
    const total = await queryBuilder.getCount();

    // 페이지네이션 적용
    const users = await queryBuilder
      .orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        username: u.username,
        role: u.role,
        isSuspended: u.isSuspended,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 사용자 정지
   */
  async suspendUser(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (user.role === UserRole.ADMIN) {
      throw new ForbiddenException('관리자 계정은 정지할 수 없습니다.');
    }

    await this.userRepository.update(userId, { isSuspended: true });
    return { message: '사용자가 정지되었습니다.' };
  }

  /**
   * 사용자 정지 해제
   */
  async unsuspendUser(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    await this.userRepository.update(userId, { isSuspended: false });
    return { message: '사용자 정지가 해제되었습니다.' };
  }

  /**
   * 게시물 목록 조회 (페이지네이션, 필터링)
   */
  async getPosts(
    page: number,
    limit: number,
    filter: 'all' | 'reported' | 'deleted',
  ): Promise<PaginatedPostsResponse> {
    const queryBuilder = this.postRepository
      .createQueryBuilder('post')
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.images', 'images');

    // 필터 적용
    if (filter === 'reported') {
      // 신고된 게시물만 필터링
      queryBuilder
        .where((qb) => {
          const subQuery = qb
            .subQuery()
            .select('report.postId')
            .from(Report, 'report')
            .getQuery();
          return `post.id IN ${subQuery}`;
        });
    } else if (filter === 'deleted') {
      // 삭제된 게시물만 필터링
      queryBuilder.where('post.isDeleted = :isDeleted', { isDeleted: true });
    }

    // 전체 개수 조회
    const total = await queryBuilder.getCount();

    // 페이지네이션 적용
    const posts = await queryBuilder
      .orderBy('post.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // 각 게시물의 신고 정보 조회
    const postIds = posts.map((p) => p.id);
    const reports = postIds.length > 0
      ? await this.reportRepository.find({
          where: postIds.map((id) => ({ postId: id })),
          relations: ['reporter'],
          order: { createdAt: 'DESC' },
        })
      : [];

    // 게시물별 신고 정보 매핑
    const reportsByPostId = new Map<string, Report[]>();
    reports.forEach((report) => {
      const existing = reportsByPostId.get(report.postId) || [];
      existing.push(report);
      reportsByPostId.set(report.postId, existing);
    });

    const postDtos: AdminPostDto[] = posts.map((post) => {
      const postReports = reportsByPostId.get(post.id) || [];
      const sortedImages = (post.images || []).sort((a, b) => a.orderIndex - b.orderIndex);

      return {
        id: post.id,
        author: {
          id: post.user?.id || post.userId,
          username: post.user?.username || 'Unknown',
        },
        firstImageUrl: sortedImages.length > 0 ? sortedImages[0].imageUrl : null,
        createdAt: post.createdAt,
        isDeleted: post.isDeleted,
        reportCount: postReports.length,
        reports: postReports.map((r) => ({
          id: r.id,
          reporter: {
            id: r.reporter?.id || r.reporterId,
            username: r.reporter?.username || 'Unknown',
          },
          reason: r.reason,
          createdAt: r.createdAt,
        })),
      };
    });

    return {
      posts: postDtos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 게시물 삭제 (soft delete)
   */
  async deletePost(postId: string): Promise<{ message: string }> {
    const post = await this.postRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }

    if (post.isDeleted) {
      throw new BadRequestException('이미 삭제된 게시물입니다.');
    }

    await this.postRepository.update(postId, { isDeleted: true });
    return { message: '게시물이 삭제되었습니다.' };
  }

  /**
   * 게시물 신고 해제 (모든 신고 삭제)
   */
  async dismissReports(postId: string): Promise<{ message: string }> {
    const post = await this.postRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }

    const result = await this.reportRepository.delete({ postId });

    if (result.affected === 0) {
      throw new BadRequestException('해당 게시물에 신고 내역이 없습니다.');
    }

    return { message: '신고가 해제되었습니다.' };
  }

  /**
   * 게시물 복원 (isDeleted = false로 변경)
   * 신고 내역이 있어도 복원 가능하며, 신고 내역은 유지됨
   */
  async restorePost(postId: string): Promise<{ message: string }> {
    const post = await this.postRepository.findOne({ where: { id: postId } });

    if (!post) {
      throw new NotFoundException('게시물을 찾을 수 없습니다.');
    }

    if (!post.isDeleted) {
      throw new BadRequestException('삭제되지 않은 게시물입니다.');
    }

    // 신고 내역은 유지하고 isDeleted만 false로 변경
    await this.postRepository.update(postId, { isDeleted: false });
    return { message: '게시물이 복원되었습니다.' };
  }

  /**
   * 날짜 문자열을 로컬 Date로 파싱 (타임존 문제 방지)
   */
  private parseDateString(dateStr: string, endOfDay = false): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (endOfDay) {
      return new Date(year, month - 1, day, 23, 59, 59, 999);
    }
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }

  /**
   * Date를 YYYY-MM-DD 문자열로 포맷 (로컬 타임존 기준)
   */
  private formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 대시보드 데이터 조회
   */
  async getDashboard(
    startDate: string,
    endDate: string,
    dauType: 'login' | 'activity',
  ): Promise<DashboardResponse> {
    const start = this.parseDateString(startDate);
    const end = this.parseDateString(endDate, true);

    // 요약 지표 계산
    const [totalUsers, newUsers, totalPosts, newPosts] = await Promise.all([
      this.getTotalUsers(end),
      this.getNewUsers(start, end),
      this.getTotalPosts(end),
      this.getNewPosts(start, end),
    ]);

    // 리텐션율 계산
    const { activeUsers, retainedUsers } = await this.calculateRetention(
      start,
      end,
      dauType,
    );
    const retentionRate =
      activeUsers > 0 ? Math.round((retainedUsers / activeUsers) * 100) : 0;

    // 일별 데이터 계산
    const dailyData = await this.calculateDailyData(
      start,
      end,
      dauType,
      totalUsers - newUsers, // 기간 시작 전 누적 사용자
      totalPosts - newPosts, // 기간 시작 전 누적 게시물
    );

    return {
      summary: {
        totalUsers,
        newUsers,
        totalPosts,
        newPosts,
        retentionRate,
        activeUsers,
        retainedUsers,
      },
      dailyData,
      meta: {
        startDate,
        endDate,
        dauType,
      },
    };
  }

  /**
   * 총 사용자 수 (기간 종료일 기준)
   */
  private async getTotalUsers(endDate: Date): Promise<number> {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .select('COUNT(*)', 'count')
      .where('user.createdAt <= :endDate', { endDate })
      .getRawOne();
    return parseInt(result?.count || '0', 10);
  }

  /**
   * 신규 사용자 수 (기간 내)
   */
  private async getNewUsers(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.userRepository
      .createQueryBuilder('user')
      .select('COUNT(*)', 'count')
      .where('user.createdAt >= :startDate', { startDate })
      .andWhere('user.createdAt <= :endDate', { endDate })
      .getRawOne();
    return parseInt(result?.count || '0', 10);
  }

  /**
   * 총 게시물 수 (삭제 제외, 기간 종료일 기준)
   */
  private async getTotalPosts(endDate: Date): Promise<number> {
    const result = await this.postRepository
      .createQueryBuilder('post')
      .select('COUNT(*)', 'count')
      .where('post.createdAt <= :endDate', { endDate })
      .andWhere('post.isDeleted = :isDeleted', { isDeleted: false })
      .getRawOne();
    return parseInt(result?.count || '0', 10);
  }

  /**
   * 신규 게시물 수 (기간 내)
   */
  private async getNewPosts(startDate: Date, endDate: Date): Promise<number> {
    const result = await this.postRepository
      .createQueryBuilder('post')
      .select('COUNT(*)', 'count')
      .where('post.createdAt >= :startDate', { startDate })
      .andWhere('post.createdAt <= :endDate', { endDate })
      .andWhere('post.isDeleted = :isDeleted', { isDeleted: false })
      .getRawOne();
    return parseInt(result?.count || '0', 10);
  }

  /**
   * 리텐션율 계산 (활성 사용자 중 2회 이상 방문한 비율)
   */
  private async calculateRetention(
    startDate: Date,
    endDate: Date,
    dauType: 'login' | 'activity',
  ): Promise<{ activeUsers: number; retainedUsers: number }> {
    if (dauType === 'login') {
      // 로그인 기준: lastLoginAt 사용
      const activeResult = await this.userRepository
        .createQueryBuilder('user')
        .select('COUNT(DISTINCT user.id)', 'count')
        .where('user.lastLoginAt >= :startDate', { startDate })
        .andWhere('user.lastLoginAt <= :endDate', { endDate })
        .getRawOne();

      // 로그인은 단일 timestamp만 저장하므로 재방문 계산 불가
      // 따라서 활동 기준으로 재방문자 계산
      const retainedResult = await this.getRetainedUsersByActivity(
        startDate,
        endDate,
      );

      return {
        activeUsers: parseInt(activeResult?.count || '0', 10),
        retainedUsers: retainedResult,
      };
    } else {
      // 활동 기준: 게시물, 댓글, 좋아요 활동
      const activeResult = await this.getActiveUsersByActivity(
        startDate,
        endDate,
      );
      const retainedResult = await this.getRetainedUsersByActivity(
        startDate,
        endDate,
      );

      return {
        activeUsers: activeResult,
        retainedUsers: retainedResult,
      };
    }
  }

  /**
   * 활동 기준 활성 사용자 수
   */
  private async getActiveUsersByActivity(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.userRepository.manager.query(
      `
      SELECT COUNT(DISTINCT "userId") as count FROM (
        SELECT "userId" FROM posts WHERE "createdAt" >= $1 AND "createdAt" <= $2
        UNION
        SELECT "userId" FROM comments WHERE "createdAt" >= $1 AND "createdAt" <= $2
        UNION
        SELECT "userId" FROM likes WHERE "updatedAt" >= $1 AND "updatedAt" <= $2
      ) activities
      `,
      [startDate, endDate],
    );
    return parseInt(result[0]?.count || '0', 10);
  }

  /**
   * 활동 기준 재방문 사용자 수 (2회 이상 다른 날 활동)
   */
  private async getRetainedUsersByActivity(
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    const result = await this.userRepository.manager.query(
      `
      SELECT COUNT(*) as count FROM (
        SELECT "userId" FROM (
          SELECT "userId", DATE("createdAt") as activity_date FROM posts
          WHERE "createdAt" >= $1 AND "createdAt" <= $2
          UNION ALL
          SELECT "userId", DATE("createdAt") as activity_date FROM comments
          WHERE "createdAt" >= $1 AND "createdAt" <= $2
          UNION ALL
          SELECT "userId", DATE("updatedAt") as activity_date FROM likes
          WHERE "updatedAt" >= $1 AND "updatedAt" <= $2
        ) all_activities
        GROUP BY "userId"
        HAVING COUNT(DISTINCT activity_date) >= 2
      ) retained
      `,
      [startDate, endDate],
    );
    return parseInt(result[0]?.count || '0', 10);
  }

  /**
   * 일별 데이터 계산
   */
  private async calculateDailyData(
    startDate: Date,
    endDate: Date,
    dauType: 'login' | 'activity',
    baseUsers: number,
    basePosts: number,
  ): Promise<DailyDataPoint[]> {
    // 일별 신규 사용자
    const dailyUsers = await this.userRepository
      .createQueryBuilder('user')
      .select("TO_CHAR(user.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt >= :startDate', { startDate })
      .andWhere('user.createdAt <= :endDate', { endDate })
      .groupBy("TO_CHAR(user.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    // 일별 신규 게시물
    const dailyPosts = await this.postRepository
      .createQueryBuilder('post')
      .select("TO_CHAR(post.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('post.createdAt >= :startDate', { startDate })
      .andWhere('post.createdAt <= :endDate', { endDate })
      .andWhere('post.isDeleted = :isDeleted', { isDeleted: false })
      .groupBy("TO_CHAR(post.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    // 일별 DAU
    const dailyDau = await this.getDailyDau(startDate, endDate, dauType);

    // 날짜별 맵 생성
    const usersByDate = new Map(
      dailyUsers.map((d) => [d.date, parseInt(d.count, 10)]),
    );
    const postsByDate = new Map(
      dailyPosts.map((d) => [d.date, parseInt(d.count, 10)]),
    );
    const dauByDate = new Map(
      dailyDau.map((d) => [d.date, parseInt(d.count, 10)]),
    );

    // 기간 내 모든 날짜 생성
    const dailyData: DailyDataPoint[] = [];
    const currentDate = new Date(startDate);
    let cumulativeUsers = baseUsers;
    let cumulativePosts = basePosts;

    while (currentDate <= endDate) {
      const dateStr = this.formatDateString(currentDate);
      const newUsers = usersByDate.get(dateStr) || 0;
      const newPosts = postsByDate.get(dateStr) || 0;
      const dau = dauByDate.get(dateStr) || 0;

      cumulativeUsers += newUsers;
      cumulativePosts += newPosts;

      dailyData.push({
        date: dateStr,
        cumulativeUsers,
        newUsers,
        cumulativePosts,
        newPosts,
        dau,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyData;
  }

  /**
   * 일별 DAU 조회
   */
  private async getDailyDau(
    startDate: Date,
    endDate: Date,
    dauType: 'login' | 'activity',
  ): Promise<{ date: string; count: string }[]> {
    if (dauType === 'login') {
      return this.userRepository
        .createQueryBuilder('user')
        .select("TO_CHAR(user.lastLoginAt, 'YYYY-MM-DD')", 'date')
        .addSelect('COUNT(DISTINCT user.id)', 'count')
        .where('user.lastLoginAt >= :startDate', { startDate })
        .andWhere('user.lastLoginAt <= :endDate', { endDate })
        .groupBy("TO_CHAR(user.lastLoginAt, 'YYYY-MM-DD')")
        .orderBy('date', 'ASC')
        .getRawMany();
    } else {
      const result = await this.userRepository.manager.query(
        `
        SELECT activity_date as date, COUNT(DISTINCT "userId") as count
        FROM (
          SELECT "userId", TO_CHAR("createdAt", 'YYYY-MM-DD') as activity_date FROM posts
          WHERE "createdAt" >= $1 AND "createdAt" <= $2
          UNION ALL
          SELECT "userId", TO_CHAR("createdAt", 'YYYY-MM-DD') as activity_date FROM comments
          WHERE "createdAt" >= $1 AND "createdAt" <= $2
          UNION ALL
          SELECT "userId", TO_CHAR("updatedAt", 'YYYY-MM-DD') as activity_date FROM likes
          WHERE "updatedAt" >= $1 AND "updatedAt" <= $2
        ) activities
        GROUP BY activity_date
        ORDER BY date ASC
        `,
        [startDate, endDate],
      );
      return result;
    }
  }
}
