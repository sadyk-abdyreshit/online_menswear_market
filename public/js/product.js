// ===================== PRODUCT DETAIL PAGE LOGIC =====================

let currentProduct = null;
let selectedSize = "S";

// Helper to normalize image paths for display depending on current page location
function formatImagePath(imgPath) {
  if (!imgPath) return "";
  if (imgPath.startsWith("http") || imgPath.startsWith("data:")) return imgPath;
  
  // Strip leading ../ or /
  let cleanPath = imgPath.replace(/^(\.\.\/|\/)+/, '');
  
  if (window.location.pathname.includes('/pages/')) {
    return "../" + cleanPath;
  }
  return cleanPath;
}

// Helper to store clean relative paths in localStorage without ../
function cleanStorageImagePath(imgPath) {
  if (!imgPath) return "";
  if (imgPath.startsWith("http") || imgPath.startsWith("data:")) return imgPath;
  return imgPath.replace(/^(\.\.\/|\/)+/, '');
}

async function loadProductDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    console.error("No product ID provided in URL.");
    showError("No product selected.");
    return;
  }

  try {
    const apiUrl = `${window.location.origin}/api/products/${productId}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Product not found (Status: ${response.status})`);
    }

    const product = await response.json();
    currentProduct = product;

    // 1. Render Product Metadata
    document.title = `${product.name} — FORME`;
    
    const titleEl = document.getElementById("productTitle");
    const priceEl = document.getElementById("productPrice");
    const descEl = document.getElementById("productDescription");
    const tagEl = document.getElementById("productTag");

    if (titleEl) titleEl.textContent = product.name;
    if (priceEl) priceEl.textContent = `$${product.price}`;
    if (descEl) descEl.textContent = product.description || "";
    if (tagEl) {
      if (product.tag) {
        tagEl.textContent = product.tag;
        tagEl.style.display = "inline-block";
      } else {
        tagEl.style.display = "none";
      }
    }

    // 2. Render Main Image & Gallery Thumbnails
    const mainImgEl = document.getElementById("mainProductImage");
    const thumbnailContainer = document.getElementById("thumbnailContainer");
    let imgList = [];

    if (Array.isArray(product.images) && product.images.length > 0) {
      imgList = product.images;
    } else if (product.image) {
      imgList = [product.image];
    }

    // Set primary main image
    if (mainImgEl && imgList.length > 0) {
      mainImgEl.src = formatImagePath(imgList[0]);
      mainImgEl.alt = product.name;
    }

    // Render thumbnail row if there are images
    if (thumbnailContainer) {
      thumbnailContainer.innerHTML = ""; // Clear existing

      if (imgList.length > 1) {
        imgList.forEach((imgPath, index) => {
          const formattedSrc = formatImagePath(imgPath);
          const thumbBtn = document.createElement("button");
          thumbBtn.className = "detail-thumb-btn" + (index === 0 ? " active" : "");
          thumbBtn.innerHTML = `<img src="${formattedSrc}" alt="${product.name} photo ${index + 1}">`;

          thumbBtn.addEventListener("click", () => {
            if (mainImgEl) mainImgEl.src = formattedSrc;
            document.querySelectorAll(".detail-thumb-btn").forEach(btn => btn.classList.remove("active"));
            thumbBtn.classList.add("active");
          });

          thumbnailContainer.appendChild(thumbBtn);
        });
      }
    }

    // 3. Render Sizes & Stock Options
    const sizeContainer = document.getElementById("sizeOptionsContainer");
    if (sizeContainer) {
      sizeContainer.innerHTML = "";

      let sizesToRender = [];
      if (Array.isArray(product.inventory) && product.inventory.length > 0) {
        sizesToRender = product.inventory;
      } else if (Array.isArray(product.sizes)) {
        sizesToRender = product.sizes.map(s => ({ size: s, stock: 10 }));
      }

      if (sizesToRender.length > 0) {
        selectedSize = sizesToRender[0].size || "S";

        sizesToRender.forEach((item, index) => {
          const btn = document.createElement("button");
          btn.className = "size-btn" + (index === 0 ? " active" : "");
          btn.textContent = item.size;
          
          if (item.stock <= 0) {
            btn.disabled = true;
            btn.classList.add("out-of-stock");
            btn.title = "Out of stock";
          }

          btn.addEventListener("click", () => {
            document.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedSize = item.size;
          });

          sizeContainer.appendChild(btn);
        });
      }
    }

  } catch (error) {
    console.error("Error loading product details:", error);
    showError("Could not load product details. Please make sure server is running.");
  }
}

function showError(message) {
  const container = document.querySelector(".product-detail-container") || document.querySelector("main") || document.body;
  if (container) {
    container.innerHTML = `
      <div style="text-align:center; margin:80px auto; max-width:500px; padding:20px;">
        <h2 style="font-family:var(--font-display, serif); margin-bottom:12px;">Product Not Found</h2>
        <p style="color:gray; font-size:14px; margin-bottom:20px;">${message}</p>
        <a href="../index.html" class="btn btn-primary" style="text-decoration:none; display:inline-block; padding:10px 20px;">Back to Shop</a>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", loadProductDetails);
// ===================== CART ACTIONS =====================

window.addCurrentToCart = function() {
  if (!currentProduct) {
    alert("Product is still loading...");
    return;
  }

  // Use the global Cart object from cart.js
  if (typeof Cart !== "undefined" && Cart.addItem) {
    Cart.addItem(currentProduct, selectedSize, 1);
  }

  updateCartUI();
  
  const basketDrawer = document.getElementById("basketDrawer");
  if (basketDrawer) openDrawer(basketDrawer);
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

  const drawerItems = document.getElementById("drawerItems");
  const drawerTotal = document.getElementById("drawerTotal");

  if (!drawerItems || !drawerTotal) return;

  const items = (typeof Cart !== "undefined" && Cart.getItems) ? Cart.getItems() : [];

  if (items.length === 0) {
    drawerItems.innerHTML = `<p class="drawer-empty">Your basket is empty.</p>`;
    drawerTotal.textContent = "$0";
    return;
  }

  drawerItems.innerHTML = "";

  items.forEach(item => {
    const qty = item.quantity || 1; // Aligning with cart.js data structure
    const itemEl = document.createElement("div");
    itemEl.className = "drawer-item";

    const displayImg = formatImagePath(item.image);

    itemEl.innerHTML = `
      <div class="drawer-item-thumb" style="background: var(--bg-alt, #f5f5f5); overflow:hidden; width:50px; height:60px;">
        ${displayImg ? `<img src="${displayImg}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;">` : ""}
      </div>
      <div class="drawer-item-info" style="flex:1; padding-left:10px;">
        <span class="name" style="display:block; font-weight:500;">${item.name}</span>
        <span class="price" style="font-size:12px; color:gray;">Size: ${item.size} | Qty: ${qty}</span>
        <span class="price" style="display:block; font-weight:600; color:var(--ink, #000);">$${item.price * qty}</span>
        <button class="drawer-item-remove" onclick="removeFromCart('${item.id}', '${item.size}')" style="background:none; border:none; color:red; cursor:pointer; font-size:11px; padding:0;">Remove</button>
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

// Sync basket when navigating pages
window.addEventListener("pageshow", updateCartUI);

// Initial execution on script load
updateCartUI();