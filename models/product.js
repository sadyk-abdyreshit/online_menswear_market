const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
    trim: true // Accepts 'S', 'M', 'L', '42', 'One Size', etc.
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    lowercase: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  tag: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  images: [{
    type: String
  }],
  inventory: [inventorySchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);