export class ProfileResponseDto {
  id: string;
  username: string;
  profileImageUrl: string | null;
  postCount: number;
  followerCount: number;
  followingCount: number;
  isFollowedByMe: boolean;
  isFollowingMe: boolean;
}
