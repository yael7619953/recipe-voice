/**
 * Coordination contract with Shira (M7/M8):
 * Add `applyOAuthToken(token: string): void` to AuthService.
 * Storage keys: auth_token + auth_user (TokenStorageService).
 */
export interface OAuthAuthMethods {
  applyOAuthToken(token: string): void;
}

export const OAUTH_TOKEN_QUERY_PARAM = 'token';
export const OAUTH_SUCCESS_REDIRECT = '/recipes';
export const OAUTH_FAILURE_ROUTE = '/auth/login';
export const OAUTH_FAILURE_ERROR = 'oauth_failed';
