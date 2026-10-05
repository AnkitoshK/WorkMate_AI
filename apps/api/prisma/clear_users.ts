import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up all users, comments, tasks, and tickets...");
  const c = await prisma.comment.deleteMany({});
  const t = await prisma.task.deleteMany({});
  const i = await prisma.issue.deleteMany({});
  const u = await prisma.user.deleteMany({});
  console.log(`✓ Removed: ${u.count} users, ${i.count} tickets, ${t.count} tasks, ${c.count} comments.`);
  console.log("The database is now ready for dynamic user creation from the UI!");
}

main()
  .catch((err) => {
    console.error("Error clearing users:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
