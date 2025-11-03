import { config } from 'dotenv';
import mongoose from 'mongoose';
import { DatabaseSeeder } from './seeder';

// Load environment variables
config();

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://localhost:27017/ecommerce';

async function runSeeder() {
  try {
    // Connect to database
    console.log('📡 Connecting to database...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Database connected\n');

    // Run seeder
    await DatabaseSeeder.seedAll();

    // Disconnect
    await mongoose.disconnect();
    console.log('\n📡 Database disconnected');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the seeder
runSeeder();
