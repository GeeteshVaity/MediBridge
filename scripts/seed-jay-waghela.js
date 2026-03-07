// Seed script to add Jay Waghela shop with 10+ medicines
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable in .env');
  process.exit(1);
}

// Medicine inventory data for Jay Waghela's shop (10+ medicines)
const medicineInventory = [
  { medicineName: 'Paracetamol 500mg', brand: 'Crocin', category: 'Pain Relief', price: 25, quantity: 150 },
  { medicineName: 'Amoxicillin 500mg', brand: 'Mox', category: 'Antibiotic', price: 85, quantity: 80 },
  { medicineName: 'Cetirizine 10mg', brand: 'Cetzine', category: 'Antihistamine', price: 35, quantity: 200 },
  { medicineName: 'Omeprazole 20mg', brand: 'Omez', category: 'Antacid', price: 65, quantity: 120 },
  { medicineName: 'Metformin 500mg', brand: 'Glycomet', category: 'Diabetes', price: 45, quantity: 100 },
  { medicineName: 'Amlodipine 5mg', brand: 'Amlong', category: 'Blood Pressure', price: 55, quantity: 90 },
  { medicineName: 'Azithromycin 500mg', brand: 'Azithral', category: 'Antibiotic', price: 120, quantity: 60 },
  { medicineName: 'Pantoprazole 40mg', brand: 'Pan-D', category: 'Antacid', price: 75, quantity: 110 },
  { medicineName: 'Ibuprofen 400mg', brand: 'Brufen', category: 'Pain Relief', price: 30, quantity: 180 },
  { medicineName: 'Montelukast 10mg', brand: 'Montair', category: 'Respiratory', price: 95, quantity: 70 },
  { medicineName: 'Atorvastatin 10mg', brand: 'Atorva', category: 'Cholesterol', price: 85, quantity: 85 },
  { medicineName: 'Losartan 50mg', brand: 'Losar', category: 'Blood Pressure', price: 60, quantity: 95 },
  { medicineName: 'Dolo 650mg', brand: 'Dolo', category: 'Pain Relief', price: 32, quantity: 250 },
  { medicineName: 'Vitamin D3 60000 IU', brand: 'D-Rise', category: 'Vitamin', price: 110, quantity: 50 },
  { medicineName: 'Multivitamin', brand: 'Becosules', category: 'Vitamin', price: 45, quantity: 130 },
];

// Function to get expiry date (6-24 months from now)
function getExpiryDate() {
  const months = Math.floor(Math.random() * 19) + 6; // 6-24 months
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
}

async function seedJayWaghela() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully!\n');

    // Define schemas
    const UserSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      role: String,
      shopName: String,
      shopAddress: String,
      location: {
        type: { type: String, enum: ['Point'] },
        coordinates: [Number],
      },
      phone: String,
    }, { timestamps: true });

    const InventorySchema = new mongoose.Schema({
      shopId: mongoose.Schema.Types.ObjectId,
      medicineName: String,
      quantity: Number,
      expiryDate: Date,
      brand: String,
      price: Number,
      category: String,
    }, { timestamps: true });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);

    // Check if Jay Waghela already exists
    let jayUser = await User.findOne({ email: 'jay.waghela@medibridge.com' });

    if (jayUser) {
      console.log('Jay Waghela already exists in the database.');
      console.log(`User ID: ${jayUser._id}`);
      
      // Delete existing inventory for this user
      const deleted = await Inventory.deleteMany({ shopId: jayUser._id });
      console.log(`Deleted ${deleted.deletedCount} existing inventory items.\n`);
    } else {
      // Create new user Jay Waghela
      const hashedPassword = await bcrypt.hash('jay@123', 10);
      
      jayUser = await User.create({
        name: 'Jay Waghela',
        email: 'jay.waghela@medibridge.com',
        password: hashedPassword,
        role: 'shop',
        shopName: 'Jay Medical Store',
        shopAddress: 'Andheri West, Mumbai, Maharashtra 400058',
        location: {
          type: 'Point',
          coordinates: [72.8361, 19.1362], // Mumbai coordinates [longitude, latitude]
        },
        phone: '+91 9876543210',
      });
      
      console.log('Created new user: Jay Waghela');
      console.log(`User ID: ${jayUser._id}`);
      console.log(`Email: ${jayUser.email}`);
      console.log(`Shop Name: ${jayUser.shopName}`);
      console.log(`Password: jay@123\n`);
    }

    // Add inventory items
    console.log('Adding medicine inventory for Jay Waghela\'s shop...\n');

    const inventoryItems = medicineInventory.map(medicine => ({
      shopId: jayUser._id,
      medicineName: medicine.medicineName,
      quantity: medicine.quantity,
      expiryDate: getExpiryDate(),
      brand: medicine.brand,
      price: medicine.price,
      category: medicine.category,
    }));

    const insertedInventory = await Inventory.insertMany(inventoryItems);
    
    console.log(`Successfully added ${insertedInventory.length} medicines to inventory:\n`);
    console.log('='.repeat(80));
    console.log('Medicine Name'.padEnd(25) + 'Brand'.padEnd(15) + 'Category'.padEnd(18) + 'Qty'.padEnd(8) + 'Price');
    console.log('='.repeat(80));
    
    insertedInventory.forEach(item => {
      console.log(
        item.medicineName.padEnd(25) +
        item.brand.padEnd(15) +
        item.category.padEnd(18) +
        String(item.quantity).padEnd(8) +
        `₹${item.price}`
      );
    });
    
    console.log('='.repeat(80));
    console.log(`\nTotal medicines added: ${insertedInventory.length}`);
    console.log('\nJay Waghela shop setup complete!');
    console.log('\nLogin credentials:');
    console.log('  Email: jay.waghela@medibridge.com');
    console.log('  Password: jay@123');

  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
    process.exit(0);
  }
}

seedJayWaghela();
