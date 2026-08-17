const mongoose = require('mongoose');

// Sub-schema for size inventory
const inventorySchema = new mongoose.Schema({
  size: { type: String, required: true },
  stock: { type: Number, default: 10 }
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  tag: { type: String, default: '' },
  description: { type: String, default: '' },
  images: [{ type: String }],
  sizes: [{ type: String }],
  inventory: [inventorySchema] // <-- Explicitly defining inventory ensures Mongoose saves it
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);