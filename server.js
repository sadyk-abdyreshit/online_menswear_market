require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Product = require('./models/Product');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Connect to local MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✓ Successfully connected to MongoDB'))
  .catch((err) => console.error('✕ MongoDB connection error:', err));

// Configure Multer storage to route images to the correct category folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const category = req.body.category || 'general';
        const uploadDir = path.join(__dirname, 'assets', 'images', category);

        // Ensure directory exists
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage });

// ===================== API ROUTES =====================
    app.get('/api/products/search', async (req, res) => {
    try {
        const query = (req.query.q || '').trim().toLowerCase();

        if (!query) {
        const all = await Product.find().sort({ createdAt: -1 });
        return res.json(all);
        }

        // Build flexible fuzzy regex pattern (e.g., "shrt" matches "shirt")
        const fuzzyPattern = query.split('').join('.*?');
        const regex = new RegExp(fuzzyPattern, 'i');

        const results = await Product.find({
        $or: [
            { name: { $regex: regex } },
            { category: { $regex: regex } },
            { tag: { $regex: regex } },
            { description: { $regex: regex } }
        ]
        });

        res.json(results);
    } catch (error) {
        console.error("Search API Error:", error);
        res.status(500).json({ error: 'Search request failed.' });
    }
    });
    
// 1. GET ALL PRODUCTS FROM MONGODB
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: 'Failed to fetch products from database.' });
    }
});

// GET SINGLE PRODUCT BY MONGODB _ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(400).json({ error: 'Invalid product ID format' });
  }
});

// 2. CREATE NEW PRODUCT IN MONGODB
app.post('/api/products', upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 }
]), async (req, res) => {
    console.log("RECEIVED BODY:", req.body);
    try {
        const { name, category, price, tag, description } = req.body;
        
        let parsedSizes = [];
        try {
            parsedSizes = JSON.parse(req.body.sizes || '[]');
        } catch (e) {
            parsedSizes = ['S', 'M', 'L', 'XL'];
        }

        if (parsedSizes.length === 0) {
            parsedSizes = ['S', 'M', 'L', 'XL'];
        }

        const images = [];
        if (req.files) {
            if (req.files['image1']) {
                const file1 = req.files['image1'][0];
                images.push(`assets/images/${category}/${file1.filename}`);
            }
            if (req.files['image2']) {
                const file2 = req.files['image2'][0];
                images.push(`assets/images/${category}/${file2.filename}`);
            }
        }

        // Build size & inventory matrix
        const inventory = parsedSizes.map(sz => ({
            size: String(sz).trim(),
            stock: 10 // Default stock per size
        }));

        const newProduct = new Product({
            name,
            category: category ? category.toLowerCase() : 'general',
            price: Number(price),
            tag: tag || '',
            description: description || '',
            images,
            inventory
        });

        await newProduct.save();
        res.json({ success: true, message: 'Product saved successfully to MongoDB!', product: newProduct });

    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: 'Internal server error during product save.' });
    }
});

// 3. DELETE PRODUCT FROM MONGODB BY ID
app.delete('/api/products/:id', async (req, res) => {
    try {
        const productId = req.params.id;
        const deletedProduct = await Product.findByIdAndDelete(productId);

        if (!deletedProduct) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        res.json({ success: true, message: 'Product deleted from MongoDB.' });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ error: 'Failed to delete product.' });
    }
});

        // PATCH: UPDATE STOCK COUNT FOR A SPECIFIC SIZE
        app.patch('/api/products/:id/stock', async (req, res) => {
        try {
            const { size, stock } = req.body;
            const product = await Product.findById(req.params.id);

            if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
            }

            // Safety fallback: Ensure product.inventory exists as an array
            if (!Array.isArray(product.inventory)) {
            product.inventory = [];
            }

            const item = product.inventory.find(i => i.size === size);
            if (item) {
            item.stock = Math.max(0, Number(stock));
            } else {
            product.inventory.push({ size, stock: Math.max(0, Number(stock)) });
            }

            // Explicitly notify Mongoose of array modifications
            product.markModified('inventory');

            await product.save();
            res.json({ success: true, message: 'Stock updated successfully.', product });
        } catch (error) {
            console.error("Stock update error:", error);
            res.status(500).json({ error: 'Failed to update stock.' });
        }
        });

    // SEARCH PRODUCTS WITH TYPO & PARTIAL MATCH TOLERANCE

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});