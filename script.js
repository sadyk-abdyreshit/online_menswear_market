// ===================== PRODUCT DATA & STORAGE =====================
let products = [];

// Fetch default products and merge them with admin-created items from localStorage
async function loadProducts() {
  try {
    const response = await fetch('assets/data/products.json');
    const defaultProducts = await response.json();
    
    // Get custom products added from the admin panel
    const customProducts = JSON.parse(localStorage.getItem("custom_products")) || [];
    
    // Combine both arrays (custom products appear first, followed by defaults)
    products = [...customProducts, ...defaultProducts];
    
    renderProducts();
  } catch (error) {
    console.error("Error loading products:", error);
    // Fallback: If fetch fails, at least load custom products from localStorage
    products = JSON.parse(localStorage.getItem("custom_products")) || [];
    renderProducts();
  }
}

// ===================== STATE =====================
let cart = [];

// ===================== DOM ELEMENTS =====================
const productGrid = document.getElementById("productGrid");
const filterRow = document.getElementById("filterRow");
const basketCount = document.getElementById("basketCount");
const drawerItems = document.getElementById("drawerItems");
const drawerEmpty = document.getElementById("drawerEmpty");
const drawerTotal = document.getElementById("drawerTotal");

// Search & Drawers Toggles
const searchToggle = document.getElementById("searchToggle");
const searchBar = document.getElementById("searchBar");
const closeSearch = document.getElementById("closeSearch");

const basketBtn = document.getElementById("basketBtn");
const basketDrawer = document.getElementById("basketDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");
const closeBasket = document.getElementById("closeBasket");

const profileBtn = document.getElementById("profileBtn");
const profileDrawer = document.getElementById("profileDrawer");
const profileOverlay = document.getElementById("profileOverlay");
const closeProfile = document.getElementById("closeProfile");

// ===================== RENDER PRODUCTS =====================
function renderProducts(filter = "all") {
  productGrid.innerHTML = "";
  
  const filtered = filter === "all" 
    ? products 
    : products.filter(p => p.category === filter);

  if (filtered.length === 0) {
    productGrid.innerHTML = `<p style="grid-column: 1 / -1; color: var(--ink-soft); font-size: 14px;">No products found in this category.</p>`;
    return;
  }

  filtered.forEach(product => {
    const card = document.createElement("div");
    card.className = "product-card";
    
    // Handle both multi-image arrays and single image strings gracefully
    let imgList = [];
    if (Array.isArray(product.images)) {
      imgList = product.images;
    } else if (product.image) {
      imgList = [product.image];
    }

    const primaryImg = imgList.length > 0 ? imgList[0] : "";
    const hoverImg = imgList.length > 1 ? imgList[1] : primaryImg;

    card.innerHTML = `
      <div class="product-image">
        ${product.tag ? `<span class="product-tag">${product.tag}</span>` : ""}
        ${primaryImg ? `<img src="${primaryImg}" alt="${product.name}" class="main-img" loading="lazy">` : ""}
        ${imgList.length > 1 ? `<img src="${hoverImg}" alt="${product.name}" class="hover-img" loading="lazy">` : ""}
      </div>
      <h3 class="product-name">${product.name}</h3>
      <p class="product-price">$${product.price}</p>
      <button class="add-btn" onclick="addToCart(${product.id})">Add to Bag</button>
    `;
    productGrid.appendChild(card);
  });
}

// ===================== FILTER CHIPS =====================
filterRow.addEventListener("click", (e) => {
  if (!e.target.classList.contains("filter-chip")) return;
  
  document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
  e.target.classList.add("active");
  
  renderProducts(e.target.dataset.filter);
});

// ===================== CART LOGIC =====================
window.addToCart = function(id) {
  const product = products.find(p => p.id === id);
  const existing = cart.find(item => item.id === id);
  
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  
  updateCartUI();
  openDrawer(basketDrawer, drawerOverlay);
};

function removeFromCart(id) {
  cart = cart.filter(item => item.id !== id);
  updateCartUI();
}

function updateCartUI() {
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  basketCount.textContent = totalItems;
  
  if (cart.length === 0) {
    drawerItems.innerHTML = `<p class="drawer-empty" id="drawerEmpty">Your basket is empty.</p>`;
    drawerTotal.textContent = "$0";
    return;
  }
  
  drawerItems.innerHTML = "";
  let subtotal = 0;
  
  cart.forEach(item => {
    subtotal += item.price * item.qty;
    const itemEl = document.createElement("div");
    itemEl.className = "drawer-item";
    
    let thumbImg = "";
    if (Array.isArray(item.images) && item.images.length > 0) {
      thumbImg = item.images[0];
    } else if (item.image) {
      thumbImg = item.image;
    }

    itemEl.innerHTML = `
      <div class="drawer-item-thumb" style="background: var(--bg-alt); overflow:hidden;">
        ${thumbImg ? `<img src="${thumbImg}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;">` : ""}
      </div>
      <div class="drawer-item-info">
        <span class="name">${item.name} (x${item.qty})</span>
        <span class="price">$${item.price * item.qty}</span>
        <button class="drawer-item-remove" onclick="removeFromCart(${item.id})">Remove</button>
      </div>
    `;
    drawerItems.appendChild(itemEl);
  });
  
  drawerTotal.textContent = `$${subtotal}`;
}

// ===================== UI INTERACTION HANDLERS =====================
function openDrawer(drawer, overlay) {
  drawer.classList.add("open");
  overlay.classList.add("open");
}

function closeDrawers() {
  basketDrawer.classList.remove("open");
  profileDrawer.classList.remove("open");
  drawerOverlay.classList.remove("open");
  profileOverlay.classList.remove("open");
}

searchToggle.addEventListener("click", () => searchBar.classList.toggle("open"));
closeSearch.addEventListener("click", () => searchBar.classList.remove("open"));

basketBtn.addEventListener("click", () => openDrawer(basketDrawer, drawerOverlay));
closeBasket.addEventListener("click", closeDrawers);
drawerOverlay.addEventListener("click", closeDrawers);

profileBtn.addEventListener("click", () => openDrawer(profileDrawer, profileOverlay));
closeProfile.addEventListener("click", closeDrawers);
profileOverlay.addEventListener("click", closeDrawers);

// Initial Load
loadProducts();