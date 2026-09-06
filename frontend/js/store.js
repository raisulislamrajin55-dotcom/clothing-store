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
      if (!data.success) throw new Error(data.message);
      products = data.products;
      renderProducts();
    } catch (err) {
      productGrid.innerHTML = `<div class="empty-placeholder">Couldn't load products right now. Please refresh the page.</div>`;
      console.error(err);
    }
  }

  function getImages(p) {
    if (Array.isArray(p.images) && p.images.length > 0) return p.images;
    if (p.image) return [p.image];
    return [];
  }

  function renderProducts() {
    if (products.length === 0) {
      productGrid.innerHTML = `<div class="empty-placeholder">No products available yet. Check back soon!</div>`;
      return;
    }

    productGrid.innerHTML = products
      .map((p) => {
        const images = getImages(p);
        const hasMultiple = images.length > 1;

        return `
      <div class="product-card">
        <div class="product-image-wrap" data-index="0">
          <div class="product-image-track">
            ${images
              .map(
                (img) =>
                  `<img src="${escapeHtml(img)}" alt="${escapeHtml(p.name)}" loading="lazy" />`
              )
              .join("")}
          </div>
          ${p.inStock === false ? '<span class="badge-outofstock">Out of Stock</span>' : ""}
          ${
            hasMultiple
              ? `
            <button type="button" class="img-nav img-nav-prev" aria-label="Previous photo">&#10094;</button>
            <button type="button" class="img-nav img-nav-next" aria-label="Next photo">&#10095;</button>
            <div class="img-dots">
              ${images
                .map((_, i) => `<span class="img-dot${i === 0 ? " active" : ""}" data-index="${i}"></span>`)
                .join("")}
            </div>
          `
              : ""
          }
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
    `;
      })
      .join("");

    document.querySelectorAll(".order-btn").forEach((btn) => {
      btn.addEventListener("click", () => openOrderModal(btn.dataset.id));
    });

    setupImageSliders();
  }

  function setupImageSliders() {
    document.querySelectorAll(".product-image-wrap").forEach((wrap) => {
      const track = wrap.querySelector(".product-image-track");
      const slides = wrap.querySelectorAll(".product-image-track img");
      const dots = wrap.querySelectorAll(".img-dot");
      const prevBtn = wrap.querySelector(".img-nav-prev");
      const nextBtn = wrap.querySelector(".img-nav-next");
      const total = slides.length;
      if (total <= 1) return;

      function goTo(index) {
        const clamped = ((index % total) + total) % total;
        wrap.dataset.index = clamped;
        track.style.transform = `translateX(-${clamped * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle("active", i === clamped));
      }

      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        goTo(Number(wrap.dataset.index) - 1);
      });
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        goTo(Number(wrap.dataset.index) + 1);
      });
      dots.forEach((dot) => {
        dot.addEventListener("click", (e) => {
          e.stopPropagation();
          goTo(Number(dot.dataset.index));
        });
      });
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
    if (!selectedProduct) return;

    clientRequestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const images = getImages(selectedProduct);
    document.getElementById("opImage").src = images[0] || "";
    document.getElementById("opImage").alt = selectedProduct.name;
    document.getElementById("opName").textContent = selectedProduct.name;
    document.getElementById("opPrice").textContent = selectedProduct.price;

    const sizeSelect = document.getElementById("sizeSelect");
    sizeSelect.innerHTML = selectedProduct.sizes
      .map((s) => `<option value="${s}">${s}</option>`)
      .join("");

    orderForm.reset();
    document.getElementById("qtyInput").value = 1;
    document.getElementById("formError").textContent = "";
    document.getElementById("phoneError").textContent = "";

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
    if (e.target === modalOverlay) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalOverlay.classList.contains("active")) closeModal();
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

  // ---------- Price calculation ----------
  function updatePriceSummary() {
    if (!selectedProduct) return;
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
    document.getElementById("formError").textContent = "";

    if (!BD_PHONE_REGEX.test(formData.phone.trim())) {
      document.getElementById("phoneError").textContent = "Enter a valid Bangladeshi number, e.g. 017XXXXXXXX";
      valid = false;
    }

    if (!formData.customerName.trim() || !formData.address.trim()) {
      document.getElementById("formError").textContent = "Please fill in all required fields.";
      valid = false;
    }

    return valid;
  }

  // ---------- Submit order ----------
  orderForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // duplicate-click guard

    const formData = {
      customerName: document.getElementById("customerName").value,
      phone: document.getElementById("phone").value,
      address: document.getElementById("address").value,
      productId: selectedProduct.id,
      quantity: Number(qtyInput.value),
      size: document.getElementById("sizeSelect").value,
      paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
      transactionId: "",
      customerNote: document.getElementById("customerNote").value,
      deliveryCharge: DELIVERY_CHARGE,
      clientRequestId,
    };

    if (!validateForm(formData)) return;

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

      if (!data.success) {
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

    // Restart the delivery animation every time a confirmation is shown
    const animEl = document.getElementById("deliveryAnimation");
    if (animEl) {
      animEl.classList.remove("play");
      void animEl.offsetWidth; // force reflow so the animation restarts
      animEl.classList.add("play");
    }

    // Reset submit lock for next time modal opens with a fresh product
    isSubmitting = false;
    const placeOrderBtn = document.getElementById("placeOrderBtn");
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order";
  }

  loadProducts();
})();