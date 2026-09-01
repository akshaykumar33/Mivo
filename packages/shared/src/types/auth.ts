import { UserDTO } from './user.js';

export interface AuthSessionResponse {
  user: UserDTO;
  accessToken: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
  iat?: number;
  exp?: number;
}
