/**
 * API-related types.
 */

export interface ApiError {
  message: string;
  statusCode?: number;
}

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
}
