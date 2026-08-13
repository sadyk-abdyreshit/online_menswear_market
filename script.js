// ===================== PRODUCT DATA & STORAGE =====================
let products = [];

// Fetch default products and merge them with admin-created items from localStorage
// Fetch products directly from MongoDB via Express API
async function loadProducts() {
  try {
    const response = await fetch('/api/products');
    products = await response.json();
    renderProducts();
  } catch (error) {
    console.error("Error loading products from database:", error);
  }
}

// ===================== STATE (SYNCED WITH LOCALSTORAGE) =====================
let cart = JSON.parse(localStorage.getItem("forme_cart")) || [];

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
  if (!productGrid) return;
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
      <a href="pages/product.html?id=${product.id}" style="text-decoration: none; color: inherit; display: block;">
        <div class="product-image">
          ${product.tag ? `<span class="product-tag">${product.tag}</span>` : ""}
          ${primaryImg ? `<img src="${primaryImg}" alt="${product.name}" class="main-img" loading="lazy">` : ""}
          ${imgList.length > 1 ? `<img src="${hoverImg}" alt="${product.name}" class="hover-img" loading="lazy">` : ""}
        </div>
        <h3 class="product-name">${product.name}</h3>
        <p class="product-price">$${product.price}</p>
      </a>
      <button class="add-btn" onclick="addToCart(${product.id})">Add to Bag</button>
    `;
    productGrid.appendChild(card);
  });
}

// ===================== FILTER CHIPS =====================
if (filterRow) {
  filterRow.addEventListener("click", (e) => {
    if (!e.target.classList.contains("filter-chip")) return;
    
    document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
    e.target.classList.add("active");
    
    renderProducts(e.target.dataset.filter);
  });
}

// ===================== CART LOGIC & STORAGE SYNCRONIZATION =====================
window.addToCart = function(id, defaultSize = "M") {
  const product = products.find(p => p.id === id);
  if (!product) return;

  const cartItemId = `${product.id}-${defaultSize}`;
  const existing = cart.find(item => item.cartId === cartItemId);
  
  let thumbImg = "";
  if (Array.isArray(product.images) && product.images.length > 0) {
    thumbImg = product.images[0];
  } else if (product.image) {
    thumbImg = product.image;
  }

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      cartId: cartItemId,
      id: product.id,
      name: product.name,
      price: product.price,
      size: defaultSize,
      image: thumbImg,
      qty: 1
    });
  }
  
  // Persist to localStorage
  localStorage.setItem("forme_cart", JSON.stringify(cart));
  
  updateCartUI();
  openDrawer(basketDrawer, drawerOverlay);
};

window.removeFromCart = function(cartId) {
  cart = cart.filter(item => item.cartId !== cartId && item.id !== cartId);
  localStorage.setItem("forme_cart", JSON.stringify(cart));
  updateCartUI();
};

function updateCartUI() {
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  if (basketCount) basketCount.textContent = totalItems;
  
  if (!drawerItems || !drawerTotal) return;

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

    itemEl.innerHTML = `
      <div class="drawer-item-thumb" style="background: var(--bg-alt); overflow:hidden;">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;">` : ""}
      </div>
      <div class="drawer-item-info">
        <span class="name">${item.name}</span>
        <span class="price">${item.size ? `Size: ${item.size} | ` : ""}Qty: ${item.qty}</span>
        <span class="price" style="font-weight:600; color:var(--ink);">$${item.price * item.qty}</span>
        <button class="drawer-item-remove" onclick="removeFromCart('${item.cartId || item.id}')">Remove</button>
      </div>
    `;
    drawerItems.appendChild(itemEl);
  });
  
  drawerTotal.textContent = `$${subtotal}`;
}

// Auto-sync cart when navigating back to homepage from product pages
window.addEventListener("pageshow", () => {
  cart = JSON.parse(localStorage.getItem("forme_cart")) || [];
  updateCartUI();
});

// ===================== UI INTERACTION HANDLERS =====================
function openDrawer(drawer, overlay) {
  if (drawer) drawer.classList.add("open");
  if (overlay) overlay.classList.add("open");
}

function closeDrawers() {
  if (basketDrawer) basketDrawer.classList.remove("open");
  if (profileDrawer) profileDrawer.classList.remove("open");
  if (drawerOverlay) drawerOverlay.classList.remove("open");
  if (profileOverlay) profileOverlay.classList.remove("open");
}

if (searchToggle && searchBar) searchToggle.addEventListener("click", () => searchBar.classList.toggle("open"));
if (closeSearch && searchBar) closeSearch.addEventListener("click", () => searchBar.classList.remove("open"));

if (basketBtn) basketBtn.addEventListener("click", () => openDrawer(basketDrawer, drawerOverlay));
if (closeBasket) closeBasket.addEventListener("click", closeDrawers);
if (drawerOverlay) drawerOverlay.addEventListener("click", closeDrawers);

if (profileBtn) profileBtn.addEventListener("click", () => openDrawer(profileDrawer, profileOverlay));
if (closeProfile) closeProfile.addEventListener("click", closeDrawers);
if (profileOverlay) profileOverlay.addEventListener("click", closeDrawers);

// Initial Load
loadProducts();
updateCartUI();