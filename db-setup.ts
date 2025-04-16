import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./server/db";
import { users } from "./shared/schema";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  try {
    console.log("Resetting and migrating schema...");
    await migrate(db, { migrationsFolder: "./drizzle" });

    console.log("Checking for existing admin...");
    const existing = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, "admin@ada.edu.az"),
    });

    if (!existing) {
      console.log("Creating default admin user...");
      await db.insert(users).values({
        email: "admin@ada.edu.az",
        password: await hashPassword("Admin123@"),
        faculty: "SITE",
        isAdmin: true,
      });
    }

    console.log("Setup complete 🎉");
  } catch (err) {
    console.error("❌ Setup failed:", err);
    process.exit(1);
  }
}

main();
