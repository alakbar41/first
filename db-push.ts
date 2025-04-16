import { db } from './server/db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './shared/schema';
import bcrypt from 'bcrypt';

async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function main() {
  try {
    console.log('Pushing schema to database...');
    
    // This will ensure any schema changes are applied properly
    await migrate(db, { migrationsFolder: './drizzle' });
    
    console.log('Schema migration completed successfully!');
    
    // Check if admin user exists, if not create it
    const existingAdmin = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, 'admin@ada.edu.az')
    });
    
    if (!existingAdmin) {
      console.log('Creating admin user...');
      const hashedPassword = await hashPassword('Admin123@');
      
      await db.insert(schema.users).values({
        email: 'admin@ada.edu.az',
        password: hashedPassword,
        faculty: 'SITE',
        isAdmin: true
      });
      
      console.log('Admin user created successfully!');
    } else {
      console.log('Admin user already exists.');
    }
    
  } catch (error) {
    console.error('Error pushing schema:', error);
  }
}

main().catch(console.error);