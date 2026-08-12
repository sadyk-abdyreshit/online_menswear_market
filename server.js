const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from your project root
app.use(express.static(path.join(__dirname)));

// Configure Multer storage to route images to the correct category folder
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Get category from the form submission data
        const category = req.body.category || 'general';
        const uploadDir = path.join(__dirname, 'assets', 'images', category);

        // Ensure the folder exists, create it if it doesn't
        fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Create a clean, unique file name using current timestamp and original name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({ storage: storage });

// API Endpoint to receive product details + uploaded image files
app.post('/api/products', upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 }
]), (req, res) => {
    try {
        const { name, category, price, tag } = req.body;
        const images = [];

        // If files were uploaded, build their relative paths for the frontend
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

        const newProduct = {
            id: Date.now(),
            name,
            category,
            price: Number(price),
            tag: tag || '',
            images
        };

        const filePath = path.join(__dirname, 'assets', 'data', 'products.json');

        // Read and update products.json
        fs.readFile(filePath, 'utf8', (err, data) => {
            let products = [];
            if (!err && data) {
                try {
                    products = JSON.parse(data);
                } catch (e) {
                    products = [];
                }
            }

            products.unshift(newProduct);

            fs.writeFile(filePath, JSON.stringify(products, null, 2), (writeErr) => {
                if (writeErr) {
                    return res.status(500).json({ error: 'Failed to save product file.' });
                }
                res.json({ success: true, message: 'Product and images uploaded successfully!' });
            });
        });

    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: 'Internal server error during upload.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});