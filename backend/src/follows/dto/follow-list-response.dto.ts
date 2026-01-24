export class FollowStatusDto {
  isFollowedByMe: boolean;
  isFollowingMe: boolean;
}

export class FollowUserDto {
  id: string;
  username: string;
  profileImageUrl: string | null;
  followStatus: FollowStatusDto;
  followedAt: string;
}

export class PaginatedFollowListDto {
  users: FollowUserDto[];
  hasMore: boolean;
  nextCursor: string | null;
}
