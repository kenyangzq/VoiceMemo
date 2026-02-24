// Shared token store for Google Drive OAuth
// In production, replace with Azure Table Storage or similar

interface TokenData {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export const tokenStore = new Map<string, TokenData>();

const DEFAULT_USER_ID = 'default-user';

export function getTokens(userId: string = DEFAULT_USER_ID): TokenData | undefined {
  return tokenStore.get(userId);
}

export function setTokens(userId: string, tokens: TokenData): void {
  tokenStore.set(userId, tokens);
}

export function hasTokens(userId: string = DEFAULT_USER_ID): boolean {
  return tokenStore.has(userId);
}

export function deleteTokens(userId: string = DEFAULT_USER_ID): void {
  tokenStore.delete(userId);
}
