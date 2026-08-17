require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Product = require('./models/Product');

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB...');

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing database products.');

    // Read products.json
    const rawData = fs.readFileSync(path.join(__dirname, '../public/assets/data/products.json'), 'utf8');
    const jsonProducts = JSON.parse(rawData);

    // Format products for MongoDB schema
    const formattedProducts = jsonProducts.map(p => {
      let imgList = [];
      if (Array.isArray(p.images)) {
        imgList = p.images;
      } else if (p.image) {
        imgList = [p.image];
      }

      // Default apparel sizes if none specified or empty
      let sizeList = Array.isArray(p.sizes) && p.sizes.length > 0 ? p.sizes : ['S', 'M', 'L', 'XL'];
      
      const inventory = sizeList.map(sz => ({
        size: String(sz).trim(),
        stock: 10 // Default initial stock of 10 per size
      }));

      return {
        name: p.name,
        category: p.category ? p.category.toLowerCase() : 'outerwear',
        price: p.price,
        tag: p.tag || '',
        description: p.description || '',
        images: imgList,
        inventory: inventory
      };
    });

    await Product.insertMany(formattedProducts);
    console.log(`✓ Successfully seeded ${formattedProducts.length} products into MongoDB!`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();