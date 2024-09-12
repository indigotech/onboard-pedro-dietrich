import bcrypt from 'bcryptjs';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

import { prisma } from '../../database.js';
import { ServerErrorGQL } from '../../server/server-error.js';
import { UserInput, AddressInput, User } from '../../typedefs.js';

export default async function createUser(userData: UserInput): Promise<User> {
  if (!validatePassword(userData.password)) {
    throw new ServerErrorGQL(
      400,
      'Invalid password.',
      'Password needs to contain at least 6 characters, with at least 1 letter and 1 digit.',
    );
  }
  if (!validateBirthDate(userData.birthDate)) {
    throw new ServerErrorGQL(
      400,
      'Unreasonable birth date detected.',
      'The birth date must be between the year 1900 and the current date.',
    );
  }

  try {
    const addressList: AddressInput[] = userData?.addresses ?? [];
    return await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: await hashPassword(userData.password),
        birthDate: new Date(userData.birthDate),
        addresses: {
          createMany: { data: addressList },
        },
      },
      include: { addresses: true },
    });
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ServerErrorGQL(
        400,
        'E-mail is already in use.',
        'The e-mail must be unique, and the one received is already present in the database.',
      );
    }

    throw new ServerErrorGQL(
      500,
      'User could not be created.',
      'The user could not be inserted in the database due to an unhandled error.',
    );
  }
}

function validatePassword(password: string): boolean {
  const passwordValidationRegex = new RegExp('^(?=.*?[A-Za-z])(?=.*?\\d).{6,}$');
  return passwordValidationRegex.test(password);
}

function validateBirthDate(birthDate: string): boolean {
  const birthDateTime = new Date(birthDate).getTime();
  const fromDate = new Date('1900-01-01').getTime();
  const today = new Date().getTime();

  return birthDateTime > fromDate && birthDateTime < today;
}

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}
