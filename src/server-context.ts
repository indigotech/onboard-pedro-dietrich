import jwt from 'jsonwebtoken';

export interface TokenInterface {
  userId: number;
  iat: number;
  exp: number;
}

export const serverContext = async function ({ req }): Promise<{ userId: number }> {
  const { operationName } = req.body;
  if (operationName === 'LoginMutation') {
    return { userId: 0 };
  }

  const token = req.headers.authorization;
  if (!token) {
    throw new Error('Authentication token missing.');
  }

  try {
    const decoded = jwt.verify(token, process.env.TOKEN_KEY) as TokenInterface;
    return { userId: decoded.userId };
  } catch (err) {
    throw new Error(`Invalid token.\n${err}`);
  }
};
