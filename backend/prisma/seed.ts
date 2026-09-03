import { databaseService } from "../src/infrastructure/database";
import { prisma } from "../src/infrastructure/database";
import { hashPassword } from "../src/shared/security/password-hasher";

const DEMO_USER_EMAIL = "demo@ecommerce.local";
const DEMO_USER_PASSWORD = "DemoUser@2026";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function main(): Promise<void> {
  await databaseService.connect();

  const email = normalizeEmail(DEMO_USER_EMAIL);
  const passwordHash = await hashPassword(DEMO_USER_PASSWORD);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash }
  });

  console.info(`Demo user seed completed for ${email}.`);
}

void main()
  .catch((error: unknown) => {
    console.error("Database seed failed.");
    console.error(error instanceof Error ? error.message : "Unknown seed error.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await databaseService.disconnect();
  });
