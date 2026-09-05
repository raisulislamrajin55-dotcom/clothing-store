(() => {
  const API_BASE = "/api";
  const DELIVERY_CHARGE = 70; // must match backend default; shown before final calc from server

  let products = [];
  let selectedProduct = null;
  let isSubmitting = false;
  let clientRequestId = null; // regenerated every time the modal opens, prevents double order on resubmit

  const productGrid = document.getElementById("productGrid");
  const modalOverlay = document.getElementById("orderModal");
  const orderFormView = document.getElementById("orderFormView");
  const orderConfirmView = document.getElementById("orderConfirmView");
  const orderForm = document.getElementById("orderForm");

  document.getElementById("year").textContent = new Date().getFullYear();

  // ---------- Fetch & render products ----------
  async function loadProducts() {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const data = await res.json();
  !data.success) throw new Error(data.message);
      products = data.products;
      renderProducts();
    } catch (err) {
      productGrid.innerHTML = `<div class="empty-placeholder">Couldn't load products right now. Please refresh the page.</div>`;
      console.error(err);
    }
  }

  function renderProducts() {
products.length === 0) {
      productGrid.innerHTML = `<div class="empty-placeholder">No products available yet. Check back soon!</div>`;
      return;
    }

    productGrid.innerHTML = products
      .map(
        (p) => `
      <div class="product-card">
        <div class="product-image-wrap">
          <img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy" />
          ${p.inStock === false ? '<span class="badge-outofstock">Out of Stock</span>' : ""}
        </div>
        <div class="product-info">
          <span class="product-category">${escapeHtml(p.category || "")}</span>
          <h3 class="product-name">${escapeHtml(p.name)}</h3>
          <p class="product-desc">${escapeHtml(p.description || "")}</p>
          <div class="product-sizes">
            ${p.sizes.map((s) => `<span class="size-chip">${escapeHtml(s)}</span>`).join("")}
          </div>
          <div class="product-footer">
            <span class="product-price">৳${p.price} <small>/ pc</small></span>
            <button class="order-btn" data-id="${p.id}" ${p.inStock === false ? "disabled" : ""}>
              ${p.inStock === false ? "Unavailable" : "Order Now"}
            </button>
          </div>
        </div>
      </div>
    `
      )
      .join("");

    document.querySelectorAll(".order-btn").forEach((btn) => {
      btn.addEventListener("click", () => openOrderModal(btn.dataset.id));
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str ?? "";
    return div.innerHTML;
  }

  // ---------- Modal open/close ----------
  function openOrderModal(productId) {
    selectedProduct = products.find((p) => p.id === productId);
!selectedProduct) return;

    clientRequestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    document.getElementById("opImage").src = selectedProduct.image;
    document.getElementById("opImage").alt = selectedProduct.name;
    document.getElementById("opName").textContent = selectedProduct.name;
    document.getElementById("opPrice").textContent = selectedProduct.price;

    const sizeSelect = document.getElementById("sizeSelect");
    sizeSelect.innerHTML = selectedProduct.sizes
      .map((s) => `<option value="${s}">${s}</option>`)
      .join("");

    orderForm.reset();
    document.getElementById("qtyInput").value = 1;
    document.getElementById("mfsDetails").style.display = "none";
    document.getElementById("formError").textContent = "";
    document.getElementById("phoneError").textContent = "";
    document.getElementById("txnError").textContent = "";

    orderFormView.style.display = "block";
    orderConfirmView.style.display = "none";

    updatePriceSummary();
    modalOverlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    modalOverlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  document.getElementById("closeModalBtn").addEventListener("click", closeModal);
  document.getElementById("closeConfirmBtn").addEventListener("click", closeModal);
  modalOverlay.addEventListener("click", (e) => {
e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
e.key === "Escape" && modalOverlay.classList.contains("active")) closeModal();
  });

  // ---------- Quantity selector ----------
  const qtyInput = document.getElementById("qtyInput");
  document.getElementById("qtyMinus").addEventListener("click", () => {
    const val = Math.max(1, Number(qtyInput.value) - 1);
    qtyInput.value = val;
    updatePriceSummary();
  });
  document.getElementById("qtyPlus").addEventListener("click", () => {
    const val = Math.min(20, Number(qtyInput.value) + 1);
    qtyInput.value = val;
    updatePriceSummary();
  });

  // ---------- Payment method toggle ----------

  document.querySelectorAll('input[name="paymentMethod"]').forEach((radio) => {
    radio.addEventListener("change", (e) => {
      const method = e.target.value;
      const mfsDetails = document.getElementById("mfsDetails");
      const txnInput = document.getElementById("transactionId");
  method === "bkash" || method === "nagad") {
        mfsDetails.style.display = "block";
        document.getElementById("mfsNumber").textContent = mfsNumbers[method];
        document.getElementById("mfsMethodName").textContent = method === "bkash" ? "bKash" : "Nagad";
        txnInput.setAttribute("required", "required");
      } else {
        mfsDetails.style.display = "none";
        txnInput.removeAttribute("required");
        document.getElementById("txnError").textContent = "";
      }
    });
  });

  // ---------- Price calculation ----------
  function updatePriceSummary() {
!selectedProduct) return;
    const qty = Number(qtyInput.value) || 1;
    const productTotal = selectedProduct.price * qty;
    const total = productTotal + DELIVERY_CHARGE;

    document.getElementById("sumProductPrice").textContent = productTotal;
    document.getElementById("sumDelivery").textContent = DELIVERY_CHARGE;
    document.getElementById("sumTotal").textContent = total;
  }

  // ---------- Validation ----------
  const BD_PHONE_REGEX = /^(?:\+?880|0)1[3-9]\d{8}$/;

  function validateForm(formData) {
    let valid = true;
    document.getElementById("phoneError").textContent = "";
    document.getElementById("txnError").textContent = "";
    document.getElementById("formError").textContent = "";

!BD_PHONE_REGEX.test(formData.phone.trim())) {
      document.getElementById("phoneError").textContent = "Enter a valid Bangladeshi number, e.g. 017XXXXXXXX";
      valid = false;
    }


      (formData.paymentMethod === "bkash" || formData.paymentMethod === "nagad") &&
      (!formData.transactionId || formData.transactionId.trim().length < 6)
    ) {
      document.getElementById("txnError").textContent = "Please enter a valid Transaction ID.";
      valid = false;
    }

!formData.customerName.trim() || !formData.address.trim()) {
      document.getElementById("formError").textContent = "Please fill in all required fields.";
      valid = false;
    }

    return valid;
  }

  // ---------- Submit order ----------
  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
isSubmitting) return; // duplicate-click guard

    const formData = {
      customerName: document.getElementById("customerName").value,
      phone: document.getElementById("phone").value,
      address: document.getElementById("address").value,
      productId: selectedProduct.id,
      quantity: Number(qtyInput.value),
      size: document.getElementById("sizeSelect").value,
      paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
      transactionId: document.getElementById("transactionId").value,
      customerNote: document.getElementById("customerNote").value,
      deliveryCharge: DELIVERY_CHARGE,
      clientRequestId,
    };

!validateForm(formData)) return;

    const placeOrderBtn = document.getElementById("placeOrderBtn");
    isSubmitting = true;
    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = "Placing Order…";

    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

  !data.success) {
        document.getElementById("formError").textContent = data.message || "Something went wrong. Please try again.";
        isSubmitting = false;
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = "Place Order";
        return;
      }

      showConfirmation(data.order);
    } catch (err) {
      console.error(err);
      document.getElementById("formError").textContent = "Network error. Please check your connection and try again.";
      isSubmitting = false;
      placeOrderBtn.disabled = false;
      placeOrderBtn.textContent = "Place Order";
    }
  });

  function showConfirmation(order) {
    document.getElementById("confOrderId").textContent = `#${order.orderId}`;
    document.getElementById("confName").textContent = order.customerName;
    document.getElementById("confPhone").textContent = order.phone;
    document.getElementById("confProduct").textContent = order.productName;
    document.getElementById("confSizeQty").textContent = `${order.size} / ${order.quantity} pc`;
    const paymentLabel = { cod: "Cash on Delivery", bkash: "bKash", nagad: "Nagad" }[order.paymentMethod];
    document.getElementById("confPayment").textContent = paymentLabel;
    document.getElementById("confTotal").textContent = `৳${order.totalAmount}`;

    orderFormView.style.display = "none";
    orderConfirmView.style.display = "block";

    // Reset submit lock for next time modal opens with a fresh product
    isSubmitting = false;
    const placeOrderBtn = document.getElementById("placeOrderBtn");
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order";
  }

  loadProducts();
})();
