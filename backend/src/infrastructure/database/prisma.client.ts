import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { config } from "../../config/env";

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: config.databaseUrl
  });

  return new PrismaClient({
    adapter,
    log: ["warn"]
  });
}

declare global {
  var prismaClient: PrismaClient | undefined;
}

export const prisma = globalThis.prismaClient ?? createPrismaClient();

if (!config.isProduction) {
  globalThis.prismaClient = prisma;
}
