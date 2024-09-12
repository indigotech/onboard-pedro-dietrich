import { PrismaClient } from '@prisma/client';

import { Address } from './typedefs.js';

export interface DatabaseUserData {
  id: number;
  name: string;
  email: string;
  password: string;
  birthDate: Date;
  addresses?: Address[];
  createdAt: Date;
  updatedAt: Date;
}

export let prisma: PrismaClient;

export const initializeDatabaseInstance = (): void => {
  prisma = new PrismaClient();
};
