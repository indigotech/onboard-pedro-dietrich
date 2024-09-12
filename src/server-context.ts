import jwt from 'jsonwebtoken';

export interface AuthenticationResult {
  isAuthenticated: boolean;
  userId: number;
}

export interface TokenInterface {
  userId: number;
  iat: number;
  exp: number;
}

export const serverContext = async function ({ req }): Promise<{ authResult: AuthenticationResult }> {
  const token = req.headers.authorization;
  if (!token) {
    return { authResult: { isAuthenticated: false, userId: null } };
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_KEY) as TokenInterface;
    return { authResult: { isAuthenticated: true, userId: decoded.userId } };
  } catch {
    return { authResult: { isAuthenticated: false, userId: null } };
  }
};
