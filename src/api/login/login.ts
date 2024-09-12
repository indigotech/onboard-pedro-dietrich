import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { ServerErrorGQL } from '../../server-error.js';
import { prisma, DatabaseUserData } from '../../database.js';
import { LoginInput, Authentication } from '../../typedefs.js';

export default async function login(loginInput: LoginInput): Promise<Authentication> {
  let user: DatabaseUserData;
  try {
    user = await prisma.user.findUnique({ where: { email: loginInput.email }, include: { addresses: true } });
  } catch {
    throw new ServerErrorGQL(
      500,
      'Could not login into account.',
      'Login could not be done due to an unhandled error.',
    );
  }

  if (user && bcrypt.compareSync(loginInput.password, user.password)) {
    const expireTime = loginInput?.rememberMe ? '7d' : '30m';
    return {
      user: user,
      token: jwt.sign({ userId: user.id }, process.env.TOKEN_KEY, { expiresIn: expireTime }),
    };
  }
  throw new ServerErrorGQL(400, 'Incorrect e-mail or password.', 'The credentials are incorrect. Try again.');
}
