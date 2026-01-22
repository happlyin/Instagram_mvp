export class PostImageResponseDto {
  id: string;
  imageUrl: string;
  orderIndex: number;
  originalFileName: string | null;
  mimeType: string | null;
}

export class PostCaptionResponseDto {
  id: string;
  text: string;
  isBold: boolean;
  isItalic: boolean;
  fontSize: number;
}

export class PostAuthorDto {
  id: string;
  username: string;
}

export class PostResponseDto {
  id: string;
  author: PostAuthorDto;
  images: PostImageResponseDto[];
  caption: PostCaptionResponseDto | null;
  createdAt: Date;
}

export class PaginatedPostsResponseDto {
  posts: PostResponseDto[];
  hasMore: boolean;
  nextCursor: string | null; // 다음 페이지 조회를 위한 커서 (마지막 포스트의 createdAt)
}
