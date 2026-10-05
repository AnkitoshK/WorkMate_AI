import "dotenv/config";
import { app, prisma } from "./app.js";

const port = Number(process.env.PORT ?? 4000);
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`WorkMate API listening on http://0.0.0.0:${port} (LAN & Localhost)`);
});

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
