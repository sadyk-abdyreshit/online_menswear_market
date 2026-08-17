// ===================== DYNAMIC CATEGORY PAGE LOGIC =====================


function formatImagePath(imgPath) {
  if (!imgPath) return "";
  if (imgPath.startsWith("http") || imgPath.startsWith("data:")) return imgPath;
  
  let cleanPath = imgPath.replace(/^(\.\.\/|\/)+/, '');
  if (window.location.pathname.includes('/pages/')) {
    return "../" + cleanPath;
  }
  return cleanPath;
}

async function loadCategoryProducts() {
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get("type");

  const pageTitle = document.getElementById("pageTitle");
  const categoryHeading = document.getElementById("categoryHeading");
  const productGrid = document.getElementById("categoryProductGrid");

  if (!categoryParam) {
    categoryHeading.textContent = "All Products";
    pageTitle.textContent = "All Products — FORME";
  } else {
    const formattedCategory = categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1);
    categoryHeading.textContent = formattedCategory;
    pageTitle.textContent = `${formattedCategory} — FORME`;
  }

  try {
    const response = await fetch('/api/products');
    const products = await response.json();

    const filtered = categoryParam 
      ? products.filter(p => p.category.toLowerCase() === categoryParam.toLowerCase())
      : products;

    productGrid.innerHTML = "";

    if (filtered.length === 0) {
      productGrid.innerHTML = `<p style="grid-column: 1 / -1; color: var(--ink-soft); font-size: 14px;">No products found in this category yet.</p>`;
      return;
    }

    filtered.forEach(product => {
      const card = document.createElement("div");
      card.className = "product-card";

      let imgList = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image];
      const primaryImg = imgList[0] ? formatImagePath(imgList[0]) : "";
      const hoverImg = imgList.length > 1 ? formatImagePath(imgList[1]) : primaryImg;

      card.innerHTML = `
        <a href="product.html?id=${product._id || product.id}" style="text-decoration: none; color: inherit; display: block;">
          <div class="product-image">
            ${product.tag ? `<span class="product-tag">${product.tag}</span>` : ""}
            ${primaryImg ? `<img src="${primaryImg}" alt="${product.name}" class="main-img" loading="lazy">` : ""}
            ${imgList.length > 1 ? `<img src="${hoverImg}" alt="${product.name}" class="hover-img" loading="lazy">` : ""}
          </div>
          <h3 class="product-name">${product.name}</h3>
          <p class="product-price">$${product.price}</p>
        </a>
      `;
      
      productGrid.appendChild(card);
    });

  } catch (error) {
    console.error("Error loading category products:", error);
    productGrid.innerHTML = `<p style="color: red;">Failed to load products.</p>`;
  }
}

// ===================== CART & DRAWER LOGIC =====================
window.removeFromCart = function(cartId) {
  cart = cart.filter(item => item.cartId !== cartId && item.id !== cartId);
  localStorage.setItem("forme_cart", JSON.stringify(cart));
  updateCartUI();
};

function updateCartUI() {
  const basketCount = document.getElementById("basketCount");
  const drawerItems = document.getElementById("drawerItems");
  const drawerTotal = document.getElementById("drawerTotal");

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

    const displayImg = formatImagePath(item.image);

    itemEl.innerHTML = `
      <div class="drawer-item-thumb" style="background: var(--bg-alt); overflow:hidden;">
        ${displayImg ? `<img src="${displayImg}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;">` : ""}
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
}// ===================== CART & DRAWER LOGIC =====================
window.removeFromCart = function(id, size) {
  if (typeof Cart !== "undefined" && Cart.removeItem) {
    Cart.removeItem(id, size);
  }
  updateCartUI();
};

function updateCartUI() {
  if (typeof Cart !== "undefined" && Cart.updateBadge) {
    Cart.updateBadge();
  }

  const drawerItems = document.getElementById("drawerItems");
  const drawerTotal = document.getElementById("drawerTotal");

  if (!drawerItems || !drawerTotal) return;

  const items = (typeof Cart !== "undefined" && Cart.getItems) ? Cart.getItems() : [];

  if (items.length === 0) {
    drawerItems.innerHTML = `<p class="drawer-empty" id="drawerEmpty">Your basket is empty.</p>`;
    drawerTotal.textContent = "$0";
    return;
  }

  drawerItems.innerHTML = "";

  items.forEach(item => {
    const qty = item.quantity || 1;
    const itemEl = document.createElement("div");
    itemEl.className = "drawer-item";

    const displayImg = formatImagePath(item.image);

    itemEl.innerHTML = `
      <div class="drawer-item-thumb" style="background: var(--bg-alt); overflow:hidden;">
        ${displayImg ? `<img src="${displayImg}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;">` : ""}
      </div>
      <div class="drawer-item-info">
        <span class="name">${item.name}</span>
        <span class="price">${item.size ? `Size: ${item.size} | ` : ""}Qty: ${qty}</span>
        <span class="price" style="font-weight:600; color:var(--ink);">$${item.price * qty}</span>
        <button class="drawer-item-remove" onclick="removeFromCart('${item.id}', '${item.size}')">Remove</button>
      </div>
    `;
    drawerItems.appendChild(itemEl);
  });

  if (typeof Cart !== "undefined" && Cart.getTotal) {
    drawerTotal.textContent = `$${Cart.getTotal()}`;
  }
}

// ===================== DRAWERS CONTROLLER =====================
const basketBtn = document.getElementById("basketBtn");
const basketDrawer = document.getElementById("basketDrawer");
const profileBtn = document.getElementById("profileBtn");
const profileDrawer = document.getElementById("profileDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");
const closeBasket = document.getElementById("closeBasket");
const closeProfile = document.getElementById("closeProfile");

function toggleDrawer(drawer) {
  // Check if the clicked drawer is already open
  const isOpen = drawer && drawer.classList.contains("open");
  
  // Always close everything first to reset the state
  closeDrawers();
  
  // If the drawer was NOT open, open it now. 
  // (If it was open, it just stays closed thanks to the line above).
  if (!isOpen && drawer) {
    drawer.classList.add("open");
    if (drawerOverlay) drawerOverlay.classList.add("open");
  }
}

function closeDrawers() {
  if (basketDrawer) basketDrawer.classList.remove("open");
  if (profileDrawer) profileDrawer.classList.remove("open");
  if (drawerOverlay) drawerOverlay.classList.remove("open");
}

// Event Listeners for Buttons
if (basketBtn) {
  basketBtn.addEventListener("click", (e) => {
    e.preventDefault(); // Prevents page jump if it's an <a> tag
    toggleDrawer(basketDrawer);
  });
}

if (profileBtn) {
  profileBtn.addEventListener("click", (e) => {
    e.preventDefault();
    toggleDrawer(profileDrawer);
  });
}

// Event Listeners for Closing
if (closeBasket) closeBasket.addEventListener("click", closeDrawers);
if (closeProfile) closeProfile.addEventListener("click", closeDrawers);
if (drawerOverlay) drawerOverlay.addEventListener("click", closeDrawers);

window.addEventListener("pageshow", updateCartUI);

// Initial Execution
loadCategoryProducts();
updateCartUI();