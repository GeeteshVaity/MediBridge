// Seed script to add medicines to the database for each medical shop
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable in .env');
  process.exit(1);
}

// Common medicines data - 15 unique medicines
const allMedicines = [
  { medicineName: 'Paracetamol 500mg', brand: 'Crocin', category: 'Pain Relief', price: 25 },
  { medicineName: 'Amoxicillin 500mg', brand: 'Mox', category: 'Antibiotic', price: 85 },
  { medicineName: 'Cetirizine 10mg', brand: 'Cetzine', category: 'Antihistamine', price: 35 },
  { medicineName: 'Omeprazole 20mg', brand: 'Omez', category: 'Antacid', price: 65 },
  { medicineName: 'Metformin 500mg', brand: 'Glycomet', category: 'Diabetes', price: 45 },
  { medicineName: 'Amlodipine 5mg', brand: 'Amlong', category: 'Blood Pressure', price: 55 },
  { medicineName: 'Azithromycin 500mg', brand: 'Azithral', category: 'Antibiotic', price: 120 },
  { medicineName: 'Pantoprazole 40mg', brand: 'Pan-D', category: 'Antacid', price: 75 },
  { medicineName: 'Ibuprofen 400mg', brand: 'Brufen', category: 'Pain Relief', price: 30 },
  { medicineName: 'Montelukast 10mg', brand: 'Montair', category: 'Respiratory', price: 95 },
  { medicineName: 'Atorvastatin 10mg', brand: 'Atorva', category: 'Cholesterol', price: 85 },
  { medicineName: 'Losartan 50mg', brand: 'Losar', category: 'Blood Pressure', price: 60 },
  { medicineName: 'Dolo 650mg', brand: 'Dolo', category: 'Pain Relief', price: 32 },
  { medicineName: 'Vitamin D3 60000 IU', brand: 'D-Rise', category: 'Vitamin', price: 110 },
  { medicineName: 'Multivitamin', brand: 'Becosules', category: 'Vitamin', price: 45 },
];

// Function to get random quantity between min and max
function getRandomQuantity(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Function to get expiry date (6-24 months from now)
function getExpiryDate() {
  const months = getRandomQuantity(6, 24);
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
}

// Function to get 5 random unique medicines from the list
function getRandomMedicines(excludeIndices = []) {
  const available = allMedicines
    .map((med, idx) => ({ ...med, idx }))
    .filter((med) => !excludeIndices.includes(med.idx));
  
  const selected = [];
  while (selected.length < 5 && available.length > 0) {
    const randomIdx = Math.floor(Math.random() * available.length);
    selected.push(available[randomIdx]);
    available.splice(randomIdx, 1);
  }
  return selected;
}

async function seedMedicines() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully!\n');

    // Get User and Inventory models
    const UserSchema = new mongoose.Schema({
      name: String,
      email: String,
      role: String,
      shopName: String,
    });
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    const InventorySchema = new mongoose.Schema({
      shopId: mongoose.Schema.Types.ObjectId,
      medicineName: String,
      quantity: Number,
      expiryDate: Date,
      brand: String,
      price: Number,
      category: String,
    }, { timestamps: true });
    const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', InventorySchema);

    // Find all shops (medical stores)
    const shops = await User.find({ role: 'shop' });
    
    if (shops.length === 0) {
      console.log('No medical shops found in the database.');
      console.log('Please register some shopkeeper accounts first.\n');
      
      // Create sample shops for demo
      console.log('Creating 3 sample medical shops for demo...\n');
      
      const sampleShops = [
        { name: 'Raj Pharma', email: 'raj.pharma@demo.com', role: 'shop', shopName: 'Raj Medical Store', shopAddress: 'Mumbai, Maharashtra', password: 'demo123' },
        { name: 'MedPlus Store', email: 'medplus@demo.com', role: 'shop', shopName: 'MedPlus Pharmacy', shopAddress: 'Pune, Maharashtra', password: 'demo123' },
        { name: 'Apollo Pharmacy', email: 'apollo@demo.com', role: 'shop', shopName: 'Apollo Pharmacy', shopAddress: 'Delhi, India', password: 'demo123' },
      ];
      
      for (const shop of sampleShops) {
        const existingShop = await User.findOne({ email: shop.email });
        if (!existingShop) {
          await User.create(shop);
          console.log(`Created shop: ${shop.shopName}`);
        }
      }
      
      // Re-fetch shops
      shops.push(...await User.find({ role: 'shop' }));
    }

    console.log(`Found ${shops.length} medical shop(s):\n`);
    shops.forEach((shop, i) => {
      console.log(`  ${i + 1}. ${shop.shopName || shop.name} (${shop.email})`);
    });
    console.log('');

    // Track which medicine indices have been used by each shop to ensure different medicines
    let usedIndicesPerShop = [];
    
    for (let i = 0; i < shops.length; i++) {
      const shop = shops[i];
      console.log(`\nAdding medicines for: ${shop.shopName || shop.name}`);
      console.log('-'.repeat(50));

      // Check existing inventory for this shop
      const existingInventory = await Inventory.find({ shopId: shop._id });
      const existingMedicineNames = existingInventory.map(inv => inv.medicineName);
      
      if (existingInventory.length > 0) {
        console.log(`  Shop already has ${existingInventory.length} medicine(s). Adding only new ones...`);
      }

      // Get 5 different medicines for each shop
      // Use modular offset to ensure different medicines for each shop
      const startIdx = (i * 5) % allMedicines.length;
      const selectedIndices = [];
      for (let j = 0; j < 5; j++) {
        selectedIndices.push((startIdx + j) % allMedicines.length);
      }
      
      const medicines = selectedIndices.map(idx => allMedicines[idx]);

      // Create inventory entries for this shop
      let addedCount = 0;
      for (const medicine of medicines) {
        // Skip if medicine already exists for this shop
        if (existingMedicineNames.includes(medicine.medicineName)) {
          console.log(`  - Skipped: ${medicine.medicineName} (already exists)`);
          continue;
        }

        const inventoryItem = {
          shopId: shop._id,
          medicineName: medicine.medicineName,
          quantity: getRandomQuantity(20, 100),
          expiryDate: getExpiryDate(),
          brand: medicine.brand,
          price: medicine.price + getRandomQuantity(-5, 10), // Slight price variation
          category: medicine.category,
        };

        await Inventory.create(inventoryItem);
        addedCount++;
        console.log(`  ✓ Added: ${medicine.medicineName} (${medicine.brand}) - ₹${inventoryItem.price} - Qty: ${inventoryItem.quantity}`);
      }
      
      console.log(`  Total added for this shop: ${addedCount}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('Seed completed successfully!');
    console.log('='.repeat(50));

    // Show summary
    const totalInventory = await Inventory.countDocuments();
    console.log(`\nTotal medicines in inventory: ${totalInventory}`);

  } catch (error) {
    console.error('Error seeding medicines:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
  }
}

// Run the seed function
seedMedicines();
