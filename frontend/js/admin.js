(() => {
  const API_BASE = "/api";
  let token = sessionStorage.getItem("adminToken") || null;
  let allOrders = [];
  let allProducts = [];

  const loginScreen = document.getElementById("loginScreen");
  const dashboard = document.getElementById("dashboard");

  // ---------- Auth ----------
  function authHeaders() {
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }

  async function tryAutoLogin() {
    if (!token) return showLogin();
    const res = await fetch(`${API_BASE}/admin/orders`, { headers: authHeaders() });
    if (res.status === 401) {
      sessionStorage.removeItem("adminToken");
      token = null;
      return showLogin();
    }
    showDashboard();
  }

  function showLogin() {
    loginScreen.style.display = "flex";
    dashboard.style.display = "none";
  }

  function showDashboard() {
    loginScreen.style.display = "none";
    dashboard.style.display = "flex";
    loadOrders();
    loadProducts();
  }

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const errorEl = document.getElementById("loginError");
    errorEl.textContent = "";

    try {
      const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!data.success) {
        errorEl.textContent = data.message || "Login failed.";
        return;
      }
      token = data.token;
      sessionStorage.setItem("adminToken", token);
      showDashboard();
    } catch (err) {
      errorEl.textContent = "Network error. Please try again.";
    }
  });

  document.getElementById("logoutBtn").addEventListener("click", () => {
    sessionStorage.removeItem("adminToken");
    token = null;
    showLogin();
  });

  // ---------- Tab navigation ----------
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach((b) => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`${btn.dataset.tab}Tab`).classList.add("active");
    });
  });

  // ---------- Orders ----------
  async function loadOrders() {
    const tbody = document.getElementById("ordersTableBody");
    tbody.innerHTML = `<tr><td colspan="9" class="empty-row">Loading orders…</td></tr>`;
    try {
      const search = document.getElementById("orderSearch").value;
      const status = document.getElementById("statusFilter").value;
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (status) params.set("status", status);

      const res = await fetch(`${API_BASE}/admin/orders?${params.toString()}`, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      allOrders = data.orders;
      renderOrders();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-row">Failed to load orders.</td></tr>`;
    }
  }

  function renderOrders() {
    const tbody = document.getElementById("ordersTableBody");
    if (allOrders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No orders found.</td></tr>`;
      return;
    }

    const statuses = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];

    tbody.innerHTML = allOrders
      .map(
        (o) => `
      <tr data-order-id="${o.orderId}">
        <td>#${o.orderId}</td>
        <td>${o.dateTime}</td>
        <td>${escapeHtml(o.customerName)}<br><small>${escapeHtml(o.phone)}</small></td>
        <td>${escapeHtml(o.productName)}</td>
        <td>${o.size} × ${o.quantity}</td>
        <td>৳${o.totalAmount}</td>
        <td>${paymentLabel(o.paymentMethod)}</td>
        <td>
          <select class="status-select" data-order-id="${o.orderId}">
            ${statuses.map((s) => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
          </select>
        </td>
        <td><button class="view-detail-btn" data-order-id="${o.orderId}">View</button></td>
      </tr>
    `
      )
      .join("");

    tbody.querySelectorAll(".status-select").forEach((select) => {
      select.addEventListener("click", (e) => e.stopPropagation());
      select.addEventListener("change", async (e) => {
        e.stopPropagation();
        await updateOrderStatus(select.dataset.orderId, select.value);
      });
    });

    tbody.querySelectorAll(".view-detail-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        showOrderDetail(btn.dataset.orderId);
      });
    });

    tbody.querySelectorAll("tr").forEach((tr) => {
      tr.addEventListener("click", () => showOrderDetail(tr.dataset.orderId));
    });
  }

  function paymentLabel(method) {
    return { cod: "COD", bkash: "bKash", nagad: "Nagad" }[method] || method;
  }

  async function updateOrderStatus(orderId, status) {
    try {
      const res = await fetch(`${API_BASE}/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        const order = allOrders.find((o) => o.orderId === orderId);
        if (order) order.status = status;
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  }

  function showOrderDetail(orderId) {
    const order = allOrders.find((o) => o.orderId === orderId);
    if (!order) return;

    const body = document.getElementById("orderDetailBody");
    body.innerHTML = `
      <h2>Order #${order.orderId}</h2>
      <div class="detail-line"><span>Date</span><span>${order.dateTime}</span></div>
      <div class="detail-line"><span>Customer</span><span>${escapeHtml(order.customerName)}</span></div>
      <div class="detail-line"><span>Phone</span><span>${escapeHtml(order.phone)}</span></div>
      <div class="detail-line"><span>Address</span><span>${escapeHtml(order.address)}</span></div>
      <div class="detail-line"><span>Product</span><span>${escapeHtml(order.productName)}</span></div>
      <div class="detail-line"><span>Size / Qty</span><span>${order.size} / ${order.quantity}</span></div>
      <div class="detail-line"><span>Product Price</span><span>৳${order.productPrice}</span></div>
      <div class="detail-line"><span>Delivery Charge</span><span>৳${order.deliveryCharge}</span></div>
      <div class="detail-line"><span>Total Amount</span><span>৳${order.totalAmount}</span></div>
      <div class="detail-line"><span>Payment Method</span><span>${paymentLabel(order.paymentMethod)}</span></div>
      <div class="detail-line"><span>Note</span><span>${escapeHtml(order.customerNote) || "—"}</span></div>
      <div class="detail-line"><span>Status</span><span>${order.status}</span></div>
    `;
    document.getElementById("orderDetailModal").classList.add("active");
  }

  document.getElementById("closeOrderDetail").addEventListener("click", () => {
    document.getElementById("orderDetailModal").classList.remove("active");
  });

  document.getElementById("orderSearch").addEventListener("input", debounce(loadOrders, 350));
  document.getElementById("statusFilter").addEventListener("change", loadOrders);

  // ---------- Products ----------
  function getImages(p) {
    if (Array.isArray(p.images) && p.images.length > 0) return p.images;
    if (p.image) return [p.image];
    return [];
  }

  async function loadProducts() {
    const grid = document.getElementById("productsAdminGrid");
    grid.innerHTML = `<p class="empty-row">Loading products…</p>`;
    try {
      const res = await fetch(`${API_BASE}/admin/products`, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      allProducts = data.products;
      renderProductsAdmin();
    } catch (err) {
      grid.innerHTML = `<p class="empty-row">Failed to load products.</p>`;
    }
  }

  function renderProductsAdmin() {
    const grid = document.getElementById("productsAdminGrid");
    if (allProducts.length === 0) {
      grid.innerHTML = `<p class="empty-row">No products yet. Add your first one!</p>`;
      return;
    }

    grid.innerHTML = allProducts
      .map((p) => {
        const images = getImages(p);
        return `
      <div class="admin-product-card">
        <img src="${escapeHtml(images[0] || "")}" alt="${escapeHtml(p.name)}" />
        <div class="admin-product-body">
          ${p.inStock === false ? '<span class="out-of-stock-tag">Out of Stock</span>' : ""}
          <h4>${escapeHtml(p.name)}</h4>
          <div class="price">৳${p.price} · ${p.sizes.join(", ")} · ${images.length} photo${images.length !== 1 ? "s" : ""}</div>
          <div class="admin-product-actions">
            <button class="edit-btn" data-id="${p.id}">Edit</button>
            <button class="stock-btn" data-id="${p.id}">${p.inStock === false ? "Mark In Stock" : "Mark Out of Stock"}</button>
            <button class="delete-btn" data-id="${p.id}">Delete</button>
          </div>
        </div>
      </div>
    `;
      })
      .join("");

    grid.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", () => openProductModal(btn.dataset.id));
    });
    grid.querySelectorAll(".stock-btn").forEach((btn) => {
      btn.addEventListener("click", () => toggleStock(btn.dataset.id));
    });
    grid.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteProduct(btn.dataset.id));
    });
  }

  async function toggleStock(id) {
    const product = allProducts.find((p) => p.id === id);
    if (!product) return;
    const newStock = product.inStock === false;
    await fetch(`${API_BASE}/admin/products/${id}/stock`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ inStock: newStock }),
    });
    loadProducts();
  }

  async function deleteProduct(id) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    await fetch(`${API_BASE}/admin/products/${id}`, { method: "DELETE", headers: authHeaders() });
    loadProducts();
  }

  const productModal = document.getElementById("productModal");
  document.getElementById("addProductBtn").addEventListener("click", () => openProductModal(null));
  document.getElementById("closeProductModal").addEventListener("click", () => productModal.classList.remove("active"));

  function openProductModal(id) {
    document.getElementById("productForm").reset();
    document.getElementById("productFormError").textContent = "";
    const product = id ? allProducts.find((p) => p.id === id) : null;
    const images = product ? getImages(product) : [];

    document.getElementById("productModalTitle").textContent = product ? "Edit Product" : "Add Product";
    document.getElementById("productIdField").value = product ? product.id : "";
    document.getElementById("prodName").value = product ? product.name : "";
    document.getElementById("prodCategory").value = product ? product.category || "" : "";
    document.getElementById("prodPrice").value = product ? product.price : "";
    document.getElementById("prodImage").value = images.join(", ");
    document.getElementById("prodSizes").value = product ? product.sizes.join(", ") : "";
    document.getElementById("prodDescription").value = product ? product.description || "" : "";
    document.getElementById("prodInStock").checked = product ? product.inStock !== false : true;

    productModal.classList.add("active");
  }

  document.getElementById("productForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("productIdField").value;
    const errorEl = document.getElementById("productFormError");
    errorEl.textContent = "";

    const sizes = document
      .getElementById("prodSizes")
      .value.split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    const images = document
      .getElementById("prodImage")
      .value.split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: document.getElementById("prodName").value.trim(),
      category: document.getElementById("prodCategory").value.trim(),
      price: Number(document.getElementById("prodPrice").value),
      images,
      sizes,
      description: document.getElementById("prodDescription").value.trim(),
      inStock: document.getElementById("prodInStock").checked,
    };

    if (!payload.name || !payload.price || images.length === 0 || sizes.length === 0) {
      errorEl.textContent = "Please fill in all required fields (at least one image and one size).";
      return;
    }

    try {
      const url = id ? `${API_BASE}/admin/products/${id}` : `${API_BASE}/admin/products`;
      const method = id ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
      const data = await res.json();
      if (!data.success) {
        errorEl.textContent = data.message || "Failed to save product.";
        return;
      }
      productModal.classList.remove("active");
      loadProducts();
    } catch (err) {
      errorEl.textContent = "Network error. Please try again.";
    }
  });

  // ---------- Utils ----------
  function escapeHtml(str) {
    if (str == null) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function debounce(fn, delay) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  tryAutoLogin();
})();