import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * 사용자 목록 조회
   * GET /admin/users?page=1&limit=10&filter=all
   */
  @Get('users')
  async getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('filter', new DefaultValuePipe('all'))
    filter: 'all' | 'suspended' | 'active',
  ) {
    return this.adminService.getUsers(page, limit, filter);
  }

  /**
   * 사용자 정지
   * PATCH /admin/users/:userId/suspend
   */
  @Patch('users/:userId/suspend')
  async suspendUser(@Param('userId') userId: string) {
    return this.adminService.suspendUser(userId);
  }

  /**
   * 사용자 정지 해제
   * PATCH /admin/users/:userId/unsuspend
   */
  @Patch('users/:userId/unsuspend')
  async unsuspendUser(@Param('userId') userId: string) {
    return this.adminService.unsuspendUser(userId);
  }

  /**
   * 게시물 목록 조회
   * GET /admin/posts?page=1&limit=10&filter=all
   */
  @Get('posts')
  async getPosts(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('filter', new DefaultValuePipe('all'))
    filter: 'all' | 'reported' | 'deleted',
  ) {
    return this.adminService.getPosts(page, limit, filter);
  }

  /**
   * 게시물 삭제 (soft delete)
   * DELETE /admin/posts/:postId
   */
  @Delete('posts/:postId')
  async deletePost(@Param('postId') postId: string) {
    return this.adminService.deletePost(postId);
  }

  /**
   * 게시물 신고 해제 (모든 신고 삭제)
   * DELETE /admin/posts/:postId/reports
   */
  @Delete('posts/:postId/reports')
  async dismissReports(@Param('postId') postId: string) {
    return this.adminService.dismissReports(postId);
  }

  /**
   * 게시물 복원 (soft delete 해제)
   * PATCH /admin/posts/:postId/restore
   */
  @Patch('posts/:postId/restore')
  async restorePost(@Param('postId') postId: string) {
    return this.adminService.restorePost(postId);
  }

  /**
   * 대시보드 데이터 조회
   * GET /admin/dashboard?startDate=2025-01-01&endDate=2025-01-07&dauType=login
   */
  @Get('dashboard')
  async getDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('dauType', new DefaultValuePipe('login'))
    dauType: 'login' | 'activity' = 'login',
  ) {
    // 기본값: 오늘 (로컬 타임존 기준 - KST)
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const start = startDate || today;
    const end = endDate || today;

    return this.adminService.getDashboard(start, end, dauType);
  }
}
