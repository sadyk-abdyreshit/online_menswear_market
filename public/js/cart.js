// ===================== REUSABLE CART SYSTEM =====================

const Cart = {
    getKey() {
        return 'forme_cart_items';
    },

    getItems() {
        try {
            return JSON.parse(localStorage.getItem(this.getKey())) || [];
        } catch (e) {
            return [];
        }
    },

    saveItems(items) {
        localStorage.setItem(this.getKey(), JSON.stringify(items));
        this.updateBadge();
    },

    addItem(product, selectedSize = 'M', quantity = 1) {
        const items = this.getItems();
        const existingIndex = items.findIndex(
            item => (item.id === product._id || item.id === product.id) && item.size === selectedSize
        );

        if (existingIndex > -1) {
            items[existingIndex].quantity += quantity;
        } else {
            items.push({
                id: product._id || product.id,
                name: product.name,
                price: product.price,
                size: selectedSize,
                image: Array.isArray(product.images) && product.images.length ? product.images[0] : product.image,
                quantity: quantity
            });
        }

        this.saveItems(items);
    },

    removeItem(id, size) {
        let items = this.getItems();
        items = items.filter(item => !(item.id === id && item.size === size));
        this.saveItems(items);
    },

    updateQuantity(id, size, delta) {
        const items = this.getItems();
        const item = items.find(i => i.id === id && i.size === size);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) {
                return this.removeItem(id, size);
            }
        }
        this.saveItems(items);
    },

    clear() {
        localStorage.removeItem(this.getKey());
        this.updateBadge();
    },

    getTotal() {
        return this.getItems().reduce((sum, item) => sum + item.price * item.quantity, 0);
    },

    updateBadge() {
        const count = this.getItems().reduce((sum, item) => sum + item.quantity, 0);
        
        // Fix: Changed from '.cart-badge-count' to '.basket-count, #basketCount'
        const badges = document.querySelectorAll('.basket-count, #basketCount');
        
        badges.forEach(b => {
            b.textContent = count;
            // Optional: Remove the next line if you always want the '0' to be visible
            b.style.display = count > 0 ? 'inline-flex' : 'none'; 
        });
    }   
};

// Auto-update badge on page load
document.addEventListener('DOMContentLoaded', () => Cart.updateBadge());