import { prisma } from '../../database.js';
import { ServerErrorGQL } from '../../server/server-error.js';
import { UserListInput, User, UserList } from '../../typedefs.js';

export default async function getUsers(usersInput: UserListInput): Promise<UserList> {
  const limit = usersInput?.userLimit ?? 10;
  const offset = usersInput?.offset ?? 0;

  try {
    const users: User[] = await prisma.user.findMany({
      take: limit,
      skip: offset,
      orderBy: { name: 'asc' },
      include: { addresses: true },
    });
    const total = await prisma.user.count();

    return {
      users: users,
      totalUsers: total,
      offset: offset,
      lastPage: offset + users.length === total,
    };
  } catch {
    throw new ServerErrorGQL(
      500,
      'Could not fetch list of users.',
      'User list could not be fetched due to an unhandled error.',
    );
  }
}
