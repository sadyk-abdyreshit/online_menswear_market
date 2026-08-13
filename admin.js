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
openAddModalBtn.addEventListener("click", () => addModal.classList.add("open"));
closeAddModalBtn.addEventListener("click", () => addModal.classList.remove("open"));
addModal.addEventListener("click", (e) => {
  if (e.target === addModal) addModal.classList.remove("open");
});

// Load Inventory directly from MongoDB API
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
    // 1. Image fallback (MongoDB stores images in product.images array)
    let imgPath = "";
    if (Array.isArray(product.images) && product.images.length > 0) {
      imgPath = product.images[0];
    } else if (product.image) {
      imgPath = product.image;
    }

    // 2. Format size & stock breakdown (e.g., "S (10), M (10), L (5)")
    let sizesDisplay = "N/A";
    if (Array.isArray(product.inventory) && product.inventory.length > 0) {
      sizesDisplay = product.inventory
        .map(item => `${item.size} (${item.stock})`)
        .join(", ");
    } else if (Array.isArray(product.sizes)) {
      sizesDisplay = product.sizes.join(", ");
    }

    // 3. Handle MongoDB `_id` vs standard `id`
    const productId = product._id || product.id;

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
      <td style="font-size: 12px; color: var(--ink-soft);">${sizesDisplay}</td>
      <td style="text-align: right;">
        <button onclick="deleteProduct('${productId}')" class="btn btn-ghost" style="padding: 6px 12px; font-size: 11px; color: red; border-color: #fee2e2;">Delete</button>
      </td>
    `;
    inventoryTableBody.appendChild(tr);
  });
}

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
    const response = await fetch('http://localhost:3000/api/products', {
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

// Initial Load
loadInventory();