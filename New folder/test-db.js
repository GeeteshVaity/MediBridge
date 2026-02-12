const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env file');
  process.exit(1);
}

console.log('🔄 Testing MongoDB connection...');
console.log('📍 URI:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//<credentials>@'));

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
})
  .then(() => {
    console.log('✅ MongoDB connected successfully!');
    console.log('📊 Database:', mongoose.connection.db.databaseName);
    mongoose.connection.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('querySrv') || error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Suggestions:');
      console.log('1. Try changing DNS to 8.8.8.8 (Google DNS)');
      console.log('2. Use standard mongodb:// connection string instead of mongodb+srv://');
      console.log('3. Try a different network (e.g., mobile hotspot)');
      console.log('4. Check if your firewall is blocking outbound connections');
    }
    
    process.exit(1);
  });
