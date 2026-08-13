// ===================== PRODUCT DETAIL PAGE LOGIC =====================

let currentProduct = null;
let selectedSize = "S";
let cart = JSON.parse(localStorage.getItem("forme_cart")) || [];

function getFixedImagePath(imgPath) {
  if (!imgPath) return "";
  if (imgPath.startsWith("http") || imgPath.startsWith("../")) {
    return imgPath;
  }
  return "../" + imgPath;
}

async function loadProductDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");

  const container = document.getElementById("productDetailContent");
  const pageTitle = document.getElementById("pageTitle");

  if (!productId) {
    container.innerHTML = `<p style="grid-column: 1/-1;">No product specified.</p>`;
    return;
  }

  try {
    const response = await fetch('../assets/data/products.json');
    const products = await response.json();

    currentProduct = products.find(p => String(p.id) === String(productId));

    if (!currentProduct) {
      container.innerHTML = `<p style="grid-column: 1/-1;">Product not found.</p>`;
      return;
    }

    pageTitle.textContent = `${currentProduct.name} — FORME`;

    let imgList = [];
    if (Array.isArray(currentProduct.images)) {
      imgList = currentProduct.images.map(img => getFixedImagePath(img));
    } else if (currentProduct.image) {
      imgList = [getFixedImagePath(currentProduct.image)];
    }

    const primaryImg = imgList.length > 0 ? imgList[0] : "";
    const description = currentProduct.description || "Crafted with exceptional precision and premium materials tailored for the modern gentleman. Designed for timeless elegance and structural ease.";
    const sizes = Array.isArray(currentProduct.sizes) && currentProduct.sizes.length > 0 
      ? currentProduct.sizes 
      : ["S", "M", "L", "XL"];

    selectedSize = sizes[0];

    container.innerHTML = `
      <!-- Gallery Column -->
      <div class="detail-gallery">
        <div class="detail-main-img" id="mainImageContainer">
          <img src="${primaryImg}" alt="${currentProduct.name}" id="expandedImg">
        </div>
        ${imgList.length > 1 ? `
          <div class="detail-thumbnails">
            ${imgList.map((img, index) => `
              <button class="detail-thumb-btn" onclick="changeMainImage('${img}')">
                <img src="${img}" alt="Thumbnail ${index + 1}">
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Info Column -->
      <div class="detail-info">
        ${currentProduct.tag ? `<span class="product-tag" style="display:inline-block; margin-bottom:12px;">${currentProduct.tag}</span>` : ""}
        <h1>${currentProduct.name}</h1>
        <p class="detail-price">$${currentProduct.price}</p>
        <p class="detail-desc">${description}</p>

        <div style="margin-bottom: 20px;">
          <span style="font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; display:block; margin-bottom: 8px; color: var(--ink-soft);">Select Size</span>
          <div class="size-options">
            ${sizes.map((size, index) => `
              <button class="size-btn ${index === 0 ? 'active' : ''}" onclick="selectSize('${size}', this)">${size}</button>
            `).join('')}
          </div>
        </div>

        <button class="btn btn-primary btn-full" onclick="addCurrentToCart()">Add to Bag</button>
      </div>
    `;

    updateCartUI();

  } catch (error) {
    console.error("Error loading product details:", error);
    container.innerHTML = `<p style="color: red;">Failed to load product details.</p>`;
  }
}

window.changeMainImage = function(imgSrc) {
  const expandedImg = document.getElementById("expandedImg");
  if (expandedImg) {
    expandedImg.src = imgSrc;
  }
};

window.selectSize = function(size, btn) {
  selectedSize = size;
  document.querySelectorAll(".size-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
};

window.addCurrentToCart = function() {
  if (!currentProduct) return;

  const cartItemId = `${currentProduct.id}-${selectedSize}`;
  const existing = cart.find(item => item.cartId === cartItemId);

  let thumbImg = "";
  if (Array.isArray(currentProduct.images) && currentProduct.images.length > 0) {
    thumbImg = getFixedImagePath(currentProduct.images[0]);
  } else if (currentProduct.image) {
    thumbImg = getFixedImagePath(currentProduct.image);
  }

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      cartId: cartItemId,
      id: currentProduct.id,
      name: currentProduct.name,
      price: currentProduct.price,
      size: selectedSize,
      image: thumbImg,
      qty: 1
    });
  }

  localStorage.setItem("forme_cart", JSON.stringify(cart));
  updateCartUI();
  openDrawer(basketDrawer);
};

window.removeFromCart = function(cartId) {
  cart = cart.filter(item => item.cartId !== cartId);
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
    drawerItems.innerHTML = `<p class="drawer-empty">Your basket is empty.</p>`;
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
        <span class="price">Size: ${item.size} | Qty: ${item.qty}</span>
        <span class="price" style="font-weight:600; color:var(--ink);">$${item.price * item.qty}</span>
        <button class="drawer-item-remove" onclick="removeFromCart('${item.cartId}')">Remove</button>
      </div>
    `;
    drawerItems.appendChild(itemEl);
  });

  drawerTotal.textContent = `$${subtotal}`;
}

// ===================== DRAWERS CONTROLLER =====================
const basketBtn = document.getElementById("basketBtn");
const basketDrawer = document.getElementById("basketDrawer");
const profileBtn = document.getElementById("profileBtn");
const profileDrawer = document.getElementById("profileDrawer");
const drawerOverlay = document.getElementById("drawerOverlay");
const closeBasket = document.getElementById("closeBasket");
const closeProfile = document.getElementById("closeProfile");

function openDrawer(drawer) {
  closeDrawers();
  if (drawer) drawer.classList.add("open");
  if (drawerOverlay) drawerOverlay.classList.add("open");
}

function closeDrawers() {
  if (basketDrawer) basketDrawer.classList.remove("open");
  if (profileDrawer) profileDrawer.classList.remove("open");
  if (drawerOverlay) drawerOverlay.classList.remove("open");
}

if (basketBtn) basketBtn.addEventListener("click", () => openDrawer(basketDrawer));
if (profileBtn) profileBtn.addEventListener("click", () => openDrawer(profileDrawer));
if (closeBasket) closeBasket.addEventListener("click", closeDrawers);
if (closeProfile) closeProfile.addEventListener("click", closeDrawers);
if (drawerOverlay) drawerOverlay.addEventListener("click", closeDrawers);

loadProductDetails();