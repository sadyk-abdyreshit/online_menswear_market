// ===================== DYNAMIC CATEGORY PAGE LOGIC =====================

// Helper to fix image paths when inside the /pages/ folder
function getFixedImagePath(imgPath) {
  if (!imgPath) return "";
  if (imgPath.startsWith("http") || imgPath.startsWith("../")) {
    return imgPath;
  }
  return "../" + imgPath;
}

async function loadCategoryProducts() {
  const urlParams = new URLSearchParams(window.location.search);
  const categoryParam = urlParams.get("type"); // e.g., ?type=tailoring

  const pageTitle = document.getElementById("pageTitle");
  const categoryHeading = document.getElementById("categoryHeading");
  const productGrid = document.getElementById("categoryProductGrid");

  if (!categoryParam) {
    categoryHeading.textContent = "All Products";
    pageTitle.textContent = "All Products — Man of Class";
  } else {
    const formattedCategory = categoryParam.charAt(0).toUpperCase() + categoryParam.slice(1);
    categoryHeading.textContent = formattedCategory;
    pageTitle.textContent = `${formattedCategory} — Man of Class`;
  }

  try {
    // Step back one folder to find products.json
    const response = await fetch('../assets/data/products.json');
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

      let imgList = [];
      if (Array.isArray(product.images)) {
        imgList = product.images;
      } else if (product.image) {
        imgList = [product.image];
      }

      // Fix image paths using our helper function
      const primaryImg = imgList.length > 0 ? getFixedImagePath(imgList[0]) : "";
      const hoverImg = imgList.length > 1 ? getFixedImagePath(imgList[1]) : primaryImg;

      card.innerHTML = `
        <div class="product-image">
          ${product.tag ? `<span class="product-tag">${product.tag}</span>` : ""}
          ${primaryImg ? `<img src="${primaryImg}" alt="${product.name}" class="main-img" loading="lazy">` : ""}
          ${imgList.length > 1 ? `<img src="${hoverImg}" alt="${product.name}" class="hover-img" loading="lazy">` : ""}
        </div>
        <h3 class="product-name">${product.name}</h3>
        <p class="product-price">$${product.price}</p>
      `;
      productGrid.appendChild(card);
    });

  } catch (error) {
    console.error("Error loading category products:", error);
    productGrid.innerHTML = `<p style="color: red;">Failed to load products.</p>`;
  }
}

loadCategoryProducts();