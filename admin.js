const addProductForm = document.getElementById("addProductForm");
const successMsg = document.getElementById("successMsg");

addProductForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append("name", document.getElementById("productName").value.trim());
  formData.append("category", document.getElementById("productCategory").value);
  formData.append("price", document.getElementById("productPrice").value);
  formData.append("tag", document.getElementById("productTag").value.trim());

  // Append image files if selected
  const image1File = document.getElementById("image1").files[0];
  const image2File = document.getElementById("image2").files[0];

  if (image1File) {
    formData.append("image1", image1File);
  }
  if (image2File) {
    formData.append("image2", image2File);
  }

  try {
    const response = await fetch('http://localhost:3000/api/products', {
      method: 'POST',
      body: formData // Note: Do not set Content-Type header manually when using FormData
    });

    const result = await response.json();

    if (result.success) {
      successMsg.textContent = "✓ Image uploaded & product published!";
      addProductForm.reset();
    } else {
      successMsg.textContent = "Error saving product.";
    }
  } catch (error) {
    console.error("Server error:", error);
    successMsg.textContent = "Could not connect to server.";
  }

  setTimeout(() => {
    successMsg.textContent = "";
  }, 4000);
});