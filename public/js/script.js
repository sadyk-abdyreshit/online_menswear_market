// ===================== PRODUCT DATA & STORAGE =====================
let products = [];

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

// ===================== DOM ELEMENTS =====================
const productGrid = document.getElementById("productGrid");
const filterRow = document.getElementById("filterRow");
const basketCount = document.getElementById("basketCount");
const drawerItems = document.getElementById("drawerItems");
const drawerEmpty = document.getElementById("drawerEmpty");
const drawerTotal = document.getElementById("drawerTotal");

// Search Bar & Pop-up Elements
const searchToggle = document.getElementById("searchToggle");
const searchBar = document.getElementById("searchBar");
const closeSearch = document.getElementById("closeSearch");
const searchInput = document.getElementById("searchInput");
const searchPopup = document.getElementById("searchResultsPopup");

// Drawer Elements
const basketBtn = document.getElementById("basketBtn");
const basketDrawer = document.getElementById("basketDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");
const closeBasket = document.getElementById("closeBasket");

const profileBtn = document.getElementById("profileBtn");
const profileDrawer = document.getElementById("profileDrawer");
const profileOverlay = document.getElementById("profileOverlay");
const closeProfile = document.getElementById("closeProfile");

// ===================== LIVE SEARCH POPUP LOGIC =====================
if (searchInput && searchPopup) {
  let searchDebounce = null;

  searchInput.addEventListener("input", (e) => {
    clearTimeout(searchDebounce);
    const query = e.target.value.trim();

    if (!query) {
      searchPopup.innerHTML = "";
      searchPopup.classList.add("hidden");
      return;
    }

    searchDebounce = setTimeout(async () => {
      try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        renderSearchPopup(results);
      } catch (error) {
        console.error("Error executing live search:", error);
      }
    }, 250);
  });

  function renderSearchPopup(productsList) {
    if (!productsList || productsList.length === 0) {
      searchPopup.innerHTML = `<div class="search-no-results">No products found matching your search.</div>`;
      searchPopup.classList.remove("hidden");
      return;
    }

    searchPopup.innerHTML = productsList.map(product => {
      let mainImg = 'https://via.placeholder.com/60';
      if (Array.isArray(product.images) && product.images.length > 0) {
        mainImg = product.images[0];
      } else if (product.image) {
        mainImg = product.image;
      }

      const prodId = product._id || product.id;

      return `
        <div class="search-result-item" onclick="window.location.href='pages/product.html?id=${prodId}'">
          <img src="${mainImg}" alt="${product.name}" class="search-result-thumb">
          <div class="search-result-info">
            <span class="search-result-title">${product.name}</span>
            <span class="search-result-meta">${product.category || 'Menswear'}</span>
          </div>
          <span class="search-result-price">$${product.price}</span>
        </div>
      `;
    }).join("");

    searchPopup.classList.remove("hidden");
  }

  document.addEventListener("click", (e) => {
    if (searchInput && searchPopup && !searchInput.contains(e.target) && !searchPopup.contains(e.target)) {
      searchPopup.classList.add("hidden");
    }
  });
}

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
    
    let imgList = [];
    if (Array.isArray(product.images)) {
      imgList = product.images;
    } else if (product.image) {
      imgList = [product.image];
    }

    const primaryImg = imgList.length > 0 ? imgList[0] : "";
    const hoverImg = imgList.length > 1 ? imgList[1] : primaryImg;
    const prodId = product._id || product.id;

    card.innerHTML = `
      <a href="pages/product.html?id=${prodId}" style="text-decoration: none; color: inherit; display: block;">
        <div class="product-image">
          ${product.tag ? `<span class="product-tag">${product.tag}</span>` : ""}
          ${primaryImg ? `<img src="${primaryImg}" alt="${product.name}" class="main-img" loading="lazy">` : ""}
          ${imgList.length > 1 ? `<img src="${hoverImg}" alt="${product.name}" class="hover-img" loading="lazy">` : ""}
        </div>
        <h3 class="product-name">${product.name}</h3>
        <p class="product-price">$${product.price}</p>
      </a>
      <button class="add-btn" onclick="addToCart('${prodId}')">Add to Bag</button>
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

// ===================== UNIFIED CART LOGIC =====================
window.addToCart = function(id, defaultSize = "M") {
  // Look up full product object before passing to Cart module
  const product = products.find(p => p._id === id || p.id === id);
  if (!product) return;

  if (typeof Cart !== "undefined" && Cart.addItem) {
    Cart.addItem(product, defaultSize, 1);
  }

  updateCartUI();
  openDrawer(basketDrawer, drawerOverlay);
};

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

    itemEl.innerHTML = `
      <div class="drawer-item-thumb" style="background: var(--bg-alt); overflow:hidden;">
        ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;">` : ""}
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

window.addEventListener("pageshow", () => {
  updateCartUI();
});

// ===================== SEARCH BAR OPEN / CLOSE =====================

if (searchToggle && searchBar) {
    searchToggle.addEventListener("click", (e) => {
        e.preventDefault();

        searchBar.classList.remove("hidden");

        if (searchInput) {
            searchInput.focus();
        }
    });
}

if (closeSearch && searchBar) {
    closeSearch.addEventListener("click", () => {
        searchBar.classList.add("hidden");

        if (searchPopup) {
            searchPopup.classList.add("hidden");
        }

        if (searchInput) {
            searchInput.value = "";
        }
    });
}

// ===================== UI INTERACTION HANDLERS =====================
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

// ===================== AUTHENTICATION UI =====================

async function updateProfileUI() {
  const profileBtn = document.getElementById('profileBtn');
  const profileBody = document.getElementById('profileBody');

  if (!profileBtn || !profileBody) return;

  const user = await Auth.getCurrentUser();

  if (!user) {
    profileBody.innerHTML = `
      <p>Sign in to view orders, saved items, and delivery addresses.</p>

      <a href="/login" class="btn btn-primary btn-full">
        Sign In
      </a>

      <a href="/register" class="btn btn-ghost btn-full">
        Create Account
      </a>
    `;

    return;
  }

  const initials = Auth.getInitials(user.name);

  profileBtn.innerHTML = `
    <span class="profile-avatar">
      ${initials}
    </span>
  `;

  profileBtn.setAttribute(
    'aria-label',
    `Profile of ${user.name}`
  );

  profileBody.innerHTML = `
    <div class="profile-user">
      <div class="profile-avatar profile-avatar-large">
        ${initials}
      </div>

      <div>
        <strong>${user.name}</strong>
        <span>${user.email}</span>
      </div>
    </div>

    <a href="/profile" class="btn btn-primary btn-full">
      My Profile
    </a>

    <a href="/orders" class="btn btn-ghost btn-full">
      My Orders
    </a>

    <button
      type="button"
      class="btn btn-ghost btn-full"
      id="logoutBtn"
    >
      Sign Out
    </button>
  `;

  const logoutBtn = document.getElementById('logoutBtn');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      Auth.logout();
    });
  }
}

updateProfileUI();

// Initial Load
loadProducts();
updateCartUI();