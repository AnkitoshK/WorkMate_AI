import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

await prisma.user.upsert({
  where: { email: "demo@workmate.local" },
  update: {},
  create: { id: "demo-user", name: "Demo User", email: "demo@workmate.local" }
});

await prisma.$disconnect();
console.log("Demo user ready (demo-user)");
