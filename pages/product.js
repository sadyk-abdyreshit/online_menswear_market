// ===================== PRODUCT DETAIL PAGE LOGIC =====================

let currentProduct = null;
let selectedSize = "S";
let cart = JSON.parse(localStorage.getItem("forme_cart")) || [];

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

  const productId = currentProduct._id || currentProduct.id;
  const cartItemId = `${productId}-${selectedSize}`;
  const existing = cart.find(item => item.cartId === cartItemId);

  let thumbImg = "";
  if (Array.isArray(currentProduct.images) && currentProduct.images.length > 0) {
    thumbImg = cleanStorageImagePath(currentProduct.images[0]);
  } else if (currentProduct.image) {
    thumbImg = cleanStorageImagePath(currentProduct.image);
  }

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      cartId: cartItemId,
      id: productId,
      name: currentProduct.name,
      price: currentProduct.price,
      size: selectedSize,
      image: thumbImg,
      qty: 1
    });
  }

  localStorage.setItem("forme_cart", JSON.stringify(cart));
  updateCartUI();
  
  const basketDrawer = document.getElementById("basketDrawer");
  if (basketDrawer) openDrawer(basketDrawer);
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

    const displayImg = formatImagePath(item.image);

    itemEl.innerHTML = `
      <div class="drawer-item-thumb" style="background: var(--bg-alt, #f5f5f5); overflow:hidden; width:50px; height:60px;">
        ${displayImg ? `<img src="${displayImg}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover;">` : ""}
      </div>
      <div class="drawer-item-info" style="flex:1; padding-left:10px;">
        <span class="name" style="display:block; font-weight:500;">${item.name}</span>
        <span class="price" style="font-size:12px; color:gray;">Size: ${item.size} | Qty: ${item.qty}</span>
        <span class="price" style="display:block; font-weight:600; color:var(--ink, #000);">$${item.price * item.qty}</span>
        <button class="drawer-item-remove" onclick="removeFromCart('${item.cartId}')" style="background:none; border:none; color:red; cursor:pointer; font-size:11px; padding:0;">Remove</button>
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

// Sync basket when navigating pages
window.addEventListener("pageshow", () => {
  cart = JSON.parse(localStorage.getItem("forme_cart")) || [];
  updateCartUI();
});

// Initial execution on script load
updateCartUI();