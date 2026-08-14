// ===================== ADMIN & INVENTORY LOGIC =====================

let allProducts = [];

// DOM Elements
const inventoryTableBody = document.getElementById("inventoryTableBody");
const totalCount = document.getElementById("totalCount");

const addModal = document.getElementById("addModal");
const openAddModalBtn = document.getElementById("openAddModalBtn");
const closeAddModalBtn = document.getElementById("closeAddModalBtn");

const addProductForm = document.getElementById("addProductForm");
const successMsg = document.getElementById("successMsg");

// Modal Toggles
if (openAddModalBtn && addModal) {
  openAddModalBtn.addEventListener("click", () => addModal.classList.add("open"));
}
if (closeAddModalBtn && addModal) {
  closeAddModalBtn.addEventListener("click", () => addModal.classList.remove("open"));
}
if (addModal) {
  addModal.addEventListener("click", (e) => {
    if (e.target === addModal) addModal.classList.remove("open");
  });
}

// Fetch Inventory directly from Express / MongoDB API
async function loadInventory() {
  try {
    const response = await fetch('/api/products');
    allProducts = await response.json();
    renderInventory();
  } catch (error) {
    console.error("Error loading inventory:", error);
  }
}

function renderInventory() {
  const inventoryTableBody = document.getElementById("inventoryTableBody");
  const totalCount = document.getElementById("totalCount");

  if (!inventoryTableBody) return;
  inventoryTableBody.innerHTML = "";

  if (totalCount) totalCount.textContent = allProducts.length;

  if (allProducts.length === 0) {
    inventoryTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No items in stock.</td></tr>`;
    return;
  }

  allProducts.forEach(product => {
    // 1. Image fallback
    let imgPath = "";
    if (Array.isArray(product.images) && product.images.length > 0) {
      imgPath = product.images[0];
    } else if (product.image) {
      imgPath = product.image;
    }

    const productId = product._id || product.id;

    // 2. Build Interactive Size & Stock Pills
    let sizesHTML = `<span style="color:var(--ink-soft); font-size:12px;">No sizes defined</span>`;
    
    let inventoryItems = [];
    if (Array.isArray(product.inventory) && product.inventory.length > 0) {
      inventoryItems = product.inventory;
    } else if (Array.isArray(product.sizes)) {
      inventoryItems = product.sizes.map(s => ({ size: s, stock: 10 }));
    }

    if (inventoryItems.length > 0) {
      sizesHTML = `<div class="stock-pills-container">`;
      inventoryItems.forEach(item => {
        sizesHTML += `
          <div class="stock-pill">
            <span class="size-name">${item.size}</span>
            <button class="stock-btn" onclick="changeStock(this, '${productId}', '${item.size}', -1)">-</button>
            <input type="number" class="stock-input" value="${item.stock}" min="0" onchange="updateStock('${productId}', '${item.size}', this.value)">
            <button class="stock-btn" onclick="changeStock(this, '${productId}', '${item.size}', 1)">+</button>
          </div>
        `;
      });
      sizesHTML += `</div>`;
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        ${imgPath ? `<img src="${imgPath}" alt="${product.name}" class="inventory-thumb">` : `<div class="inventory-thumb"></div>`}
      </td>
      <td>
        <strong>${product.name}</strong>
        ${product.tag ? `<span class="tag-badge" style="margin-left: 8px;">${product.tag}</span>` : ""}
      </td>
      <td style="text-transform: capitalize;">${product.category || "General"}</td>
      <td>$${product.price}</td>
      <td>${sizesHTML}</td>
      <td style="text-align: right;">
        <button onclick="deleteProduct('${productId}')" class="btn btn-ghost" style="padding: 6px 12px; font-size: 11px; color: red; border-color: #fee2e2;">Delete</button>
      </td>
    `;
    inventoryTableBody.appendChild(tr);
  });
}

// Handler for + and - buttons
window.changeStock = async function(btn, productId, size, delta) {
  const input = btn.parentElement.querySelector('.stock-input');
  let currentVal = parseInt(input.value) || 0;
  let newVal = Math.max(0, currentVal + delta);
  input.value = newVal;
  await updateStock(productId, size, newVal);
};

// Handler to sync stock with MongoDB
window.updateStock = async function(productId, size, newStock) {
  const stockVal = Math.max(0, Number(newStock));

  try {
    const response = await fetch(`/api/products/${productId}/stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ size, stock: stockVal })
    });

    const result = await response.json();
    if (result.success) {
      loadInventory(); // Refresh list to keep state in sync
    } else {
      alert("Failed to update stock in database.");
    }
  } catch (error) {
    console.error("Stock update error:", error);
  }
};

// Delete Product from MongoDB
window.deleteProduct = async function(productId) {
  if (!confirm("Are you sure you want to remove this product from inventory?")) return;

  try {
    const response = await fetch(`/api/products/${productId}`, {
      method: 'DELETE'
    });
    const result = await response.json();

    if (result.success) {
      loadInventory();
    } else {
      alert("Failed to delete product.");
    }
  } catch (error) {
    console.error("Delete request error:", error);
  }
};

// Form Submit Handler
if (addProductForm) {
  addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", document.getElementById("productName").value.trim());
    formData.append("category", document.getElementById("productCategory").value);
    formData.append("price", document.getElementById("productPrice").value);
    formData.append("tag", document.getElementById("productTag").value.trim());
    formData.append("description", document.getElementById("productDesc").value.trim());

    const sizesInput = document.getElementById("productSizes").value.trim();
    const sizesArray = sizesInput ? sizesInput.split(",").map(s => s.trim()).filter(Boolean) : [];
    formData.append("sizes", JSON.stringify(sizesArray));

    const image1File = document.getElementById("image1").files[0];
    const image2File = document.getElementById("image2").files[0];

    if (image1File) formData.append("image1", image1File);
    if (image2File) formData.append("image2", image2File);

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        body: formData 
      });

      const result = await response.json();

      if (result.success) {
        successMsg.textContent = "✓ Product published successfully!";
        addProductForm.reset();
        
        setTimeout(() => {
          addModal.classList.remove("open");
          successMsg.textContent = "";
          loadInventory();
        }, 1200);
      } else {
        successMsg.textContent = "Error saving product.";
      }
    } catch (error) {
      console.error("Server error:", error);
      successMsg.textContent = "Could not connect to server.";
    }
  });
}

// Initial Load
loadInventory();