export class CommentAuthorDto {
  id: string;
  username: string;
  profileImageUrl: string | null;
}

export class CommentResponseDto {
  id: string;
  text: string;
  author: CommentAuthorDto;
  createdAt: Date;
}

export class PaginatedCommentsResponseDto {
  comments: CommentResponseDto[];
  hasMore: boolean;
  nextCursor: string | null;
}
