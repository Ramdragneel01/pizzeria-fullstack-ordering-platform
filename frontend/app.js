const API_BASE_URL = "/api";
const CATEGORY_FILTERS = ["all", "veg", "nonveg"];
const ORDER_STEPS = ["placed", "preparing", "baking", "out_for_delivery", "delivered"];

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const state = {
  pizzas: [],
  toppings: [],
  isCatalogLoading: true,
  dataSource: "",
  statusMessage: "",
  statusError: false,
  searchTerm: "",
  activeFilter: "all",
  cart: {},
  customer: {
    name: "",
    phone: "",
    address: "",
  },
  notes: "",
  placingOrder: false,
  trackedOrder: null,
  trackingBusy: false,
};

const elements = {
  menuSection: document.getElementById("menu-section"),
  menuGrid: document.getElementById("menu-grid"),
  menuState: document.getElementById("menu-state"),
  statusBanner: document.getElementById("status-banner"),
  searchInput: document.getElementById("search-input"),
  filterButtons: [...document.querySelectorAll("[data-filter]")],
  cartList: document.getElementById("cart-list"),
  cartEmpty: document.getElementById("cart-empty"),
  itemCount: document.getElementById("item-count"),
  subtotalValue: document.getElementById("subtotal-value"),
  taxValue: document.getElementById("tax-value"),
  deliveryValue: document.getElementById("delivery-value"),
  totalValue: document.getElementById("total-value"),
  checkoutForm: document.getElementById("checkout-form"),
  customerName: document.getElementById("customer-name"),
  customerPhone: document.getElementById("customer-phone"),
  customerAddress: document.getElementById("customer-address"),
  orderNotes: document.getElementById("order-notes"),
  placeOrderBtn: document.getElementById("place-order-btn"),
  trackingCard: document.getElementById("tracking-card"),
  trackingOrderId: document.getElementById("tracking-order-id"),
  trackingCurrentStatus: document.getElementById("tracking-current-status"),
  trackingTimeline: document.getElementById("tracking-timeline"),
  trackingLastUpdate: document.getElementById("tracking-last-update"),
  advanceStatusBtn: document.getElementById("advance-status-btn"),
  refreshStatusBtn: document.getElementById("refresh-status-btn"),
  heroRefreshTracking: document.getElementById("hero-refresh-tracking"),
  startOrderingBtn: document.getElementById("start-ordering"),
  toppingsGrid: document.getElementById("toppings-grid"),
  metricPizzas: document.getElementById("metric-pizzas"),
  metricToppings: document.getElementById("metric-toppings"),
};

const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

function formatCurrency(value) {
  return currency.format(Number(value) || 0);
}

function normalizePizza(item) {
  return {
    id: String(item?.id ?? ""),
    name: String(item?.name ?? "Chef Special"),
    type: String(item?.type ?? "veg").toLowerCase() === "veg" ? "veg" : "nonveg",
    price: Number(item?.price ?? 0),
    image: String(item?.image ?? ""),
    description: String(item?.description ?? "Freshly baked with handcrafted ingredients."),
    topping: Array.isArray(item?.topping) ? item.topping.map(String) : [],
  };
}

function normalizeTopping(item) {
  return {
    id: String(item?.id ?? ""),
    tname: String(item?.tname ?? "Topping"),
    price: Number(item?.price ?? 0),
    image: String(item?.image ?? ""),
  };
}

function prettifyStatus(status) {
  return String(status ?? "unknown")
    .toLowerCase()
    .split("_")
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

async function fetchJson(url, options = undefined) {
  const response = await fetch(url, options);
  let payload = {};

  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const errorMessage =
      payload?.error?.message ||
      payload?.detail ||
      `Request failed (${response.status})`;

    throw new Error(errorMessage);
  }

  return payload;
}

function setStatusMessage(message, isError = false) {
  state.statusMessage = String(message || "");
  state.statusError = Boolean(isError);

  if (!state.statusMessage) {
    elements.statusBanner.classList.add("hidden");
    elements.statusBanner.textContent = "";
    return;
  }

  elements.statusBanner.classList.remove("hidden");
  elements.statusBanner.classList.toggle("error", state.statusError);
  elements.statusBanner.textContent = state.statusMessage;
}

function getFilteredPizzas() {
  return state.pizzas.filter((pizza) => {
    const matchesFilter = state.activeFilter === "all" || pizza.type === state.activeFilter;
    const searchPool = `${pizza.name} ${pizza.description} ${pizza.topping.join(" ")}`.toLowerCase();
    const matchesSearch = searchPool.includes(state.searchTerm.trim().toLowerCase());
    return matchesFilter && matchesSearch;
  });
}

function getCartItems() {
  return state.pizzas
    .filter((pizza) => state.cart[pizza.id])
    .map((pizza) => {
      const quantity = state.cart[pizza.id];
      return {
        ...pizza,
        quantity,
        lineTotal: quantity * pizza.price,
      };
    });
}

function getPricing(cartItems) {
  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = Math.round(subtotal * 0.05);
  const deliveryFee = subtotal === 0 ? 0 : subtotal >= 500 ? 0 : 49;
  return {
    subtotal,
    tax,
    deliveryFee,
    total: subtotal + tax + deliveryFee,
  };
}

function updateHeroMetrics() {
  elements.metricPizzas.textContent = state.pizzas.length > 0 ? String(state.pizzas.length) : "--";
  elements.metricToppings.textContent = state.toppings.length > 0 ? String(state.toppings.length) : "--";
}

function updateQuantity(pizzaId, nextQuantity) {
  const safeQuantity = Math.max(0, Math.min(12, Number(nextQuantity) || 0));
  if (safeQuantity === 0) {
    delete state.cart[pizzaId];
  } else {
    state.cart[pizzaId] = safeQuantity;
  }

  renderMenu();
  renderCart();
}

function renderMenu() {
  const filtered = getFilteredPizzas();

  if (state.isCatalogLoading) {
    elements.menuState.classList.remove("hidden");
    elements.menuState.textContent = "Loading menu cards...";
    elements.menuGrid.innerHTML = "";
    return;
  }

  if (filtered.length === 0) {
    elements.menuState.classList.remove("hidden");
    elements.menuState.textContent = "No pizzas match this search. Try another keyword.";
    elements.menuGrid.innerHTML = "";
    return;
  }

  elements.menuState.classList.add("hidden");
  elements.menuState.textContent = "";

  elements.menuGrid.innerHTML = filtered
    .map((pizza) => {
      const quantity = state.cart[pizza.id] || 0;
      const tags = pizza.topping
        .slice(0, 4)
        .map((item) => `<span class="tag">${escapeHtml(item)}</span>`)
        .join("");

      return `
        <article class="pizza-card">
          <div class="pizza-image-wrap">
            <img src="${escapeHtml(pizza.image)}" alt="${escapeHtml(pizza.name)}" loading="lazy" />
            <span class="type-pill ${escapeHtml(pizza.type)}">${pizza.type === "veg" ? "Veg" : "Non Veg"}</span>
          </div>

          <div class="pizza-content">
            <h3>${escapeHtml(pizza.name)}</h3>
            <p>${escapeHtml(pizza.description)}</p>

            <div class="tag-list">${tags}</div>

            <div class="card-footer">
              <strong>${formatCurrency(pizza.price)}</strong>

              <div class="qty-control" aria-label="Quantity selector for ${escapeHtml(pizza.name)}">
                <button type="button" data-action="decrement" data-pizza-id="${escapeHtml(pizza.id)}">-</button>
                <span>${quantity}</span>
                <button type="button" data-action="increment" data-pizza-id="${escapeHtml(pizza.id)}">+</button>
              </div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderCart() {
  const cartItems = getCartItems();
  const pricing = getPricing(cartItems);
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  elements.itemCount.textContent = `${itemCount} ${itemCount === 1 ? "item" : "items"}`;
  elements.subtotalValue.textContent = formatCurrency(pricing.subtotal);
  elements.taxValue.textContent = formatCurrency(pricing.tax);
  elements.deliveryValue.textContent = pricing.deliveryFee === 0 ? "Free" : formatCurrency(pricing.deliveryFee);
  elements.totalValue.textContent = formatCurrency(pricing.total);

  if (cartItems.length === 0) {
    elements.cartList.innerHTML = "";
    elements.cartEmpty.classList.remove("hidden");
    return;
  }

  elements.cartEmpty.classList.add("hidden");
  elements.cartList.innerHTML = cartItems
    .map((item) => {
      return `
        <li>
          <div>
            <strong>${escapeHtml(item.name)}</strong>
            <small>${item.quantity} x ${formatCurrency(item.price)}</small>
          </div>
          <span>${formatCurrency(item.lineTotal)}</span>
        </li>
      `;
    })
    .join("");
}

function renderTracking() {
  const trackedOrder = state.trackedOrder;

  if (!trackedOrder) {
    elements.trackingCard.classList.add("hidden");
    elements.heroRefreshTracking.disabled = true;
    return;
  }

  elements.trackingCard.classList.remove("hidden");
  elements.heroRefreshTracking.disabled = false;

  elements.trackingOrderId.textContent = trackedOrder.orderNumber || trackedOrder.id;
  elements.trackingCurrentStatus.textContent = `Current status: ${prettifyStatus(trackedOrder.status)}`;

  const activeIndex = ORDER_STEPS.indexOf(String(trackedOrder.status || "").toLowerCase());
  elements.trackingTimeline.innerHTML = ORDER_STEPS.map((step, index) => {
    const isComplete = index <= activeIndex;
    const isCurrent = step === trackedOrder.status;

    return `
      <div class="timeline-step ${isComplete ? "complete" : ""} ${isCurrent ? "current" : ""}">
        <span class="dot"></span>
        <span>${prettifyStatus(step)}</span>
      </div>
    `;
  }).join("");

  const statusHistory = Array.isArray(trackedOrder.statusHistory) ? trackedOrder.statusHistory : [];
  const latestEntry = statusHistory.length > 0 ? statusHistory[statusHistory.length - 1] : null;

  if (latestEntry?.at) {
    elements.trackingLastUpdate.textContent = `Last update: ${prettifyStatus(latestEntry.status)} at ${new Date(
      latestEntry.at,
    ).toLocaleTimeString()}`;
  } else {
    elements.trackingLastUpdate.textContent = "";
  }

  const normalizedStatus = String(trackedOrder.status || "").toLowerCase();
  const isTerminal = normalizedStatus === "delivered" || normalizedStatus === "cancelled";

  elements.advanceStatusBtn.disabled = state.trackingBusy || isTerminal;
  elements.refreshStatusBtn.disabled = state.trackingBusy;
  elements.heroRefreshTracking.disabled = state.trackingBusy;
}

function renderToppings() {
  if (!state.toppings.length) {
    elements.toppingsGrid.innerHTML = '<p class="state-message">Topping inventory preview unavailable.</p>';
    return;
  }

  elements.toppingsGrid.innerHTML = state.toppings
    .slice(0, 8)
    .map((item) => {
      return `
        <article>
          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.tname)}" loading="lazy" />
          <div>
            <strong>${escapeHtml(item.tname)}</strong>
            <span>${formatCurrency(item.price)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

async function loadCatalog() {
  state.isCatalogLoading = true;
  renderMenu();
  setStatusMessage("Preparing your menu...");

  try {
    const [pizzaPayload, toppingPayload] = await Promise.all([
      fetchJson(`${API_BASE_URL}/pizzas`),
      fetchJson(`${API_BASE_URL}/toppings`),
    ]);

    state.pizzas = (pizzaPayload.pizzas || pizzaPayload || []).map(normalizePizza);
    state.toppings = (toppingPayload.toppings || toppingPayload || []).map(normalizeTopping);
    state.dataSource = "api";
    setStatusMessage("Live menu loaded from order platform API.");
  } catch {
    try {
      const [localPizzas, localToppings] = await Promise.all([
        fetchJson("/data/pizza.json"),
        fetchJson("/data/ingredients.json"),
      ]);

      state.pizzas = (localPizzas || []).map(normalizePizza);
      state.toppings = (localToppings || []).map(normalizeTopping);
      state.dataSource = "fallback";
      setStatusMessage("Backend is unavailable, showing local menu fallback for preview.", true);
    } catch {
      state.pizzas = [];
      state.toppings = [];
      setStatusMessage("Unable to load menu data. Start backend or verify JSON assets.", true);
    }
  } finally {
    state.isCatalogLoading = false;
    updateHeroMetrics();
    renderMenu();
    renderToppings();
  }
}

async function refreshTrackedOrder() {
  if (!state.trackedOrder?.id) {
    return;
  }

  state.trackingBusy = true;
  renderTracking();

  try {
    const payload = await fetchJson(`${API_BASE_URL}/orders/${state.trackedOrder.id}`);
    state.trackedOrder = payload.order || payload;
    setStatusMessage("Order timeline refreshed.");
  } catch {
    setStatusMessage("Unable to refresh timeline. Make sure backend API is running.", true);
  } finally {
    state.trackingBusy = false;
    renderTracking();
  }
}

async function advanceOrderStatus() {
  if (!state.trackedOrder?.id) {
    return;
  }

  state.trackingBusy = true;
  renderTracking();

  try {
    const payload = await fetchJson(`${API_BASE_URL}/orders/${state.trackedOrder.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    state.trackedOrder = payload.order || payload;
    setStatusMessage(`Order moved to ${prettifyStatus(state.trackedOrder.status)}.`);
  } catch {
    setStatusMessage("Unable to update order status right now.", true);
  } finally {
    state.trackingBusy = false;
    renderTracking();
  }
}

async function placeOrder(event) {
  event.preventDefault();

  const cartItems = getCartItems();
  const name = elements.customerName.value.trim();
  const phone = elements.customerPhone.value.trim();
  const address = elements.customerAddress.value.trim();
  const notes = elements.orderNotes.value.trim();

  if (cartItems.length === 0) {
    setStatusMessage("Add at least one pizza to place an order.", true);
    return;
  }

  if (!name || !phone || !address) {
    setStatusMessage("Please add name, phone, and delivery address.", true);
    return;
  }

  if (state.dataSource !== "api") {
    setStatusMessage("Run the backend API to place live orders. Menu preview is active right now.", true);
    return;
  }

  state.placingOrder = true;
  elements.placeOrderBtn.disabled = true;
  elements.placeOrderBtn.textContent = "Placing Order...";

  try {
    const payload = await fetchJson(`${API_BASE_URL}/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: {
          name,
          phone,
          address,
        },
        notes,
        paymentMethod: "card",
        items: cartItems.map((item) => ({
          pizzaId: item.id,
          quantity: item.quantity,
        })),
      }),
    });

    const nextOrder = payload.order || payload;
    state.trackedOrder = nextOrder;
    state.cart = {};
    elements.orderNotes.value = "";
    setStatusMessage(`Order ${nextOrder.orderNumber || nextOrder.id} placed successfully.`);

    renderMenu();
    renderCart();
    renderTracking();
  } catch {
    setStatusMessage("Order creation failed. Verify API server and try again.", true);
  } finally {
    state.placingOrder = false;
    elements.placeOrderBtn.disabled = false;
    elements.placeOrderBtn.textContent = "Place Order";
  }
}

function wireEvents() {
  elements.startOrderingBtn.addEventListener("click", () => {
    elements.menuSection.scrollIntoView({ behavior: "smooth" });
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.searchTerm = event.target.value;
    renderMenu();
  });

  for (const button of elements.filterButtons) {
    button.addEventListener("click", () => {
      const nextFilter = button.dataset.filter || "all";
      if (!CATEGORY_FILTERS.includes(nextFilter)) {
        return;
      }

      state.activeFilter = nextFilter;
      for (const candidate of elements.filterButtons) {
        candidate.classList.toggle("active", candidate.dataset.filter === nextFilter);
      }

      renderMenu();
    });
  }

  elements.menuGrid.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action][data-pizza-id]");
    if (!button) {
      return;
    }

    const pizzaId = button.dataset.pizzaId;
    const action = button.dataset.action;
    const current = state.cart[pizzaId] || 0;
    const next = action === "increment" ? current + 1 : current - 1;
    updateQuantity(pizzaId, next);
  });

  elements.checkoutForm.addEventListener("submit", placeOrder);

  elements.refreshStatusBtn.addEventListener("click", () => {
    refreshTrackedOrder();
  });

  elements.heroRefreshTracking.addEventListener("click", () => {
    refreshTrackedOrder();
  });

  elements.advanceStatusBtn.addEventListener("click", () => {
    advanceOrderStatus();
  });
}

function bootstrap() {
  wireEvents();
  updateHeroMetrics();
  renderMenu();
  renderCart();
  renderToppings();
  renderTracking();
  loadCatalog();
}

bootstrap();
