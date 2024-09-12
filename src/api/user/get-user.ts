import { prisma } from '../../database.js';
import { ServerErrorGQL } from '../../server-error.js';
import { GetUserInput, User } from '../../typedefs.js';

export default async function getUser(userId: GetUserInput): Promise<User> {
  let user: User;
  try {
    user = await prisma.user.findUnique({ where: { id: +userId.id }, include: { addresses: true } });
  } catch {
    throw new ServerErrorGQL(500, 'Could not fetch user data.', 'User could not be found due to an unhandled error.');
  }

  if (!user) {
    throw new ServerErrorGQL(404, 'User does not exist.', 'No user with the specified ID could be found.');
  }
  return user;
}
