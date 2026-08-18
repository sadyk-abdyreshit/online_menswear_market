const path = require('path');
// Load .env from root folder
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const { authenticateToken, requireAdmin } = require('./middleware/auth');
const mongoose = require('mongoose');
const fs = require('fs');
const multer = require('multer');

// Require model from root /models directory
const Product = require('./models/Product');
const app = express();
const PORT = process.env.PORT || 3000;

// Resolve path to public folder (root/public)
const publicPath = path.join(__dirname, '../public');

app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authRoutes);

// ===================== PROTECTED ADMIN PAGE =====================

app.get(
    ['/admin', '/admin/', '/admin/index.html'],
    authenticateToken,
    requireAdmin,
    (req, res) => {
        res.sendFile(
            path.join(publicPath, 'admin', 'index.html')
        );
    }
);

// Serve static frontend files
app.use(express.static(publicPath));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✓ Successfully connected to MongoDB'))
  .catch((err) => console.error('✕ MongoDB connection error:', err));

// Configure Multer to upload into public/assets/images/<category>
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const category = req.body.category ? req.body.category.toLowerCase() : 'general';
        const uploadDir = path.join(publicPath, 'assets', 'images', category);

        // Ensure folder exists
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

// SEARCH PRODUCTS
app.get('/api/products/search', async (req, res) => {
    try {
        const query = (req.query.q || '').trim().toLowerCase();

        if (!query) {
            const all = await Product.find().sort({ createdAt: -1 });
            return res.json(all);
        }

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

// GET ALL PRODUCTS
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().sort({ createdAt: -1 });
        res.json(products);
    } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: 'Failed to fetch products from database.' });
    }
});

// GET SINGLE PRODUCT BY ID
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

// CREATE NEW PRODUCT
app.post(
    '/api/products',
    authenticateToken,
    requireAdmin,
    upload.fields([
        { name: 'image1', maxCount: 1 },
        { name: 'image2', maxCount: 1 }
    ]),
    async (req, res) => {
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

        const categoryFolder = category ? category.toLowerCase() : 'general';
        const images = [];
        
        if (req.files) {
            if (req.files['image1']) {
                const file1 = req.files['image1'][0];
                images.push(`assets/images/${categoryFolder}/${file1.filename}`);
            }
            if (req.files['image2']) {
                const file2 = req.files['image2'][0];
                images.push(`assets/images/${categoryFolder}/${file2.filename}`);
            }
        }

        const inventory = parsedSizes.map(sz => ({
            size: String(sz).trim(),
            stock: 10
        }));

        const newProduct = new Product({
            name,
            category: categoryFolder,
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

// DELETE PRODUCT
app.delete(
    '/api/products/:id',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
    try {
        const deletedProduct = await Product.findByIdAndDelete(req.params.id);

        if (!deletedProduct) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        res.json({ success: true, message: 'Product deleted from MongoDB.' });
    } catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ error: 'Failed to delete product.' });
    }
});

// UPDATE STOCK COUNT
app.patch(
    '/api/products/:id/stock',
    authenticateToken,
    requireAdmin,
    async (req, res) => {
    try {
        const { size, stock } = req.body;
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ error: 'Product not found.' });
        }

        if (!Array.isArray(product.inventory)) {
            product.inventory = [];
        }

        const item = product.inventory.find(i => i.size === size);
        if (item) {
            item.stock = Math.max(0, Number(stock));
        } else {
            product.inventory.push({ size, stock: Math.max(0, Number(stock)) });
        }

        product.markModified('inventory');
        await product.save();
        
        res.json({ success: true, message: 'Stock updated successfully.', product });
    } catch (error) {
        console.error("Stock update error:", error);
        res.status(500).json({ error: 'Failed to update stock.' });
    }
});

// ===================== PAGE ROUTES =====================

// Shop Pages
app.get(['/category', '/category.html'], (req, res) => {
    res.sendFile(path.join(publicPath, 'pages', 'category.html'));
});

app.get(['/product', '/product.html'], (req, res) => {
    res.sendFile(path.join(publicPath, 'pages', 'product.html'));
});

app.get(['/checkout', '/checkout.html'], (req, res) => {
    res.sendFile(path.join(publicPath, 'pages', 'checkout.html'));
});

app.get(['/login', '/login.html'], (req, res) => {
    res.sendFile(path.join(publicPath, 'pages', 'login.html'));
});

app.get(['/register', '/register.html'], (req, res) => {
    res.sendFile(path.join(publicPath, 'pages', 'register.html'));
});

app.get(['/profile', '/profile.html'], (req, res) => {
    res.sendFile(path.join(publicPath, 'pages', 'profile.html'));
});

// Order Submission Endpoint
app.post('/api/orders', async (req, res) => {
    try {
        const { items, customer, shippingAddress, totalAmount } = req.body;
        // Place database order logic or payment handling here
        console.log("New Order Received:", { items, customer, totalAmount });
        res.json({ success: true, message: 'Order placed successfully!' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to process order' });
    }
});

// ===================== CATCH-ALL ROUTE =====================
app.use((req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// ===================== START SERVER =====================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
});