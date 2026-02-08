export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    hasMore: boolean;
    nextCursor?: string | null;
  };
}
