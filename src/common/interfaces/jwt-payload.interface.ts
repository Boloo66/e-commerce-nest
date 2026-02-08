export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

export interface ValidatedUser {
  id: string;
  email: string;
  role: string;
}
