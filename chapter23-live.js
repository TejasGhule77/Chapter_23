/**
 * Chapter 23 — The Memory House
 * Production Client Engine (Express & MongoDB)
 *
 * Implements:
 * - Customer Registration, Login & Session Management
 * - Customer Account Portal (Profile, Orders, Timeline)
 * - Order Management (Submission & Status Tracking)
 * - Personalized Customer Video Interview Scheduling & Links
 * - Photo & Memory Collection Multi-upload with Captions & Stories
 * - Customer In-App Notifications Feed
 * - Private Studio Admin Dashboard (Metrics, Orders, Customers, Interview Slots, Questionnaire Notes, Photo Review)
 */

(() => {
  "use strict";

  const cfg = window.CHAPTER23_CONFIG || {};
  const API_BASE = (cfg.apiBaseUrl || "/api").replace(/\/$/, "");

  // DOM Elements
  const adminBtn = document.getElementById("adminBtn");
  const accountBtn = document.getElementById("accountBtn");
  const modalEl = document.getElementById("modal");
  const modalBodyEl = document.getElementById("modalBody");
  const modalDialogEl = modalEl ? modalEl.querySelector(".dialog") : null;

  // State
  let currentUser = null;
  let isAdmin = false;
  let authToken = localStorage.getItem("c23_auth_token") || null;

  // HTML Escape helper
  const esc = (v) =>
    String(v ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  // Dynamic CSS injection for modern portal features adhering to C23 Design System
  const styleTag = document.createElement("style");
  styleTag.textContent = `
    .dialog.wide { width: min(920px, 96vw) !important; max-height: 92vh; }
    .dialog.large { width: min(1080px, 96vw) !important; max-height: 94vh; }
    .c23-tab-bar { display: flex; gap: 8px; border-bottom: 1px solid var(--line); margin: 20px 0 24px; overflow-x: auto; padding-bottom: 2px; }
    .c23-tab-btn { background: none; border: none; border-bottom: 2px solid transparent; padding: 8px 14px; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; font-family: 'DM Mono', monospace; cursor: pointer; color: var(--grey); transition: all 0.2s; white-space: nowrap; }
    .c23-tab-btn:hover { color: var(--ink); }
    .c23-tab-btn.active { color: var(--wine); border-bottom-color: var(--wine); font-weight: 600; }
    .c23-status-badge { display: inline-flex; align-items: center; padding: 4px 8px; font-size: 10px; font-family: 'DM Mono', monospace; letter-spacing: 0.08em; text-transform: uppercase; border-radius: 2px; line-height: 1; }
    .badge-requested { background: #faf4e8; color: #8a6414; border: 1px solid #ebd8ae; }
    .badge-confirmed, .badge-approved { background: #eef6ee; color: #236928; border: 1px solid #c2e2c4; }
    .badge-interview-pending, .badge-interview-scheduled { background: #edf4fa; color: #1c5b88; border: 1px solid #c0d8ec; }
    .badge-interview-completed, .badge-photos-received { background: #f5eff9; color: #5a2e7a; border: 1px solid #dcc6ec; }
    .badge-photos-pending, .badge-awaiting { background: #fdf5eb; color: #9c5c16; border: 1px solid #f4d3ac; }
    .badge-in-production, .badge-shipped { background: #f9f0f2; color: var(--wine); border: 1px solid #e7c5ce; }
    .badge-completed, .badge-paid { background: #eaf4eb; color: #1e6b26; border: 1px solid #bce1be; font-weight: 600; }
    .badge-cancelled, .badge-rejected { background: #fbeff1; color: #a33245; border: 1px solid #e8bac2; }
    .c23-card { background: white; border: 1px solid var(--line); padding: 20px; margin-bottom: 16px; }
    .c23-card h3 { font-family: 'Instrument Serif', Georgia, serif; font-size: 26px; font-weight: normal; margin: 0 0 10px; }
    .c23-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .c23-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .c23-grid-4 { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 14px; }
    @media (max-width: 680px) { .c23-grid-2, .c23-grid-3 { grid-template-columns: 1fr; } }
    .c23-metric-box { border: 1px solid var(--line); background: white; padding: 16px; text-align: left; }
    .c23-metric-num { font-size: 32px; font-family: 'Instrument Serif', Georgia, serif; line-height: 1; color: var(--wine); }
    .c23-metric-label { font-size: 9px; font-family: 'DM Mono', monospace; letter-spacing: 0.12em; text-transform: uppercase; color: var(--grey); margin-top: 6px; }
    .c23-photo-thumb { width: 100%; aspect-ratio: 1; object-fit: cover; border: 1px solid var(--line); }
    .c23-photo-card { border: 1px solid var(--line); background: white; padding: 12px; display: flex; flex-direction: column; justify-content: space-between; }
    .c23-notice-banner { padding: 14px 18px; background: #f8f6f0; border-left: 3px solid var(--wine); margin: 15px 0 20px; font-size: 13px; line-height: 1.6; }
    .c23-table-wrap { overflow-x: auto; margin-top: 15px; border: 1px solid var(--line); background: white; }
    .c23-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .c23-table th { background: #ece7df; padding: 11px 14px; text-align: left; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; border-bottom: 1px solid var(--line); white-space: nowrap; }
    .c23-table td { padding: 12px 14px; border-bottom: 1px solid #ebe6df; vertical-align: top; }
    .c23-table tr:last-child td { border-bottom: none; }
    .c23-table tr:hover td { background: #faf8f5; }
    .c23-input-group { margin-bottom: 16px; }
    .c23-input-group label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 6px; font-family: 'DM Mono', monospace; }
    .c23-input-group input, .c23-input-group select, .c23-input-group textarea { width: 100%; padding: 12px 14px; border: 1px solid #aaa; background: white; font-family: 'DM Sans', Arial, sans-serif; font-size: 13px; }
    .c23-btn-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .c23-small-btn { padding: 8px 12px; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; font-family: 'DM Mono', monospace; border: 1px solid var(--ink); background: var(--ink); color: white; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
    .c23-small-btn:hover { background: var(--wine); border-color: var(--wine); }
    .c23-small-btn.outline { background: transparent; color: var(--ink); }
    .c23-small-btn.outline:hover { background: var(--ink); color: white; }
    .c23-badge-unread { background: var(--wine); color: white; font-size: 9px; padding: 2px 5px; border-radius: 9px; margin-left: 6px; vertical-align: middle; }
  `;
  document.head.appendChild(styleTag);

  // Status Badge Class helper
  function getBadgeClass(status) {
    const s = String(status || "").toLowerCase().replace(/\s+/g, "-");
    return `badge-${s}`;
  }

  // API Client with Cookies & Bearer Token fallback
  async function api(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    // Handle FormData upload (omit Content-Type so browser sets boundary)
    if (options.body instanceof FormData) {
      delete headers["Content-Type"];
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: "include", // Send/receive HTTP-only cookies
      });

      const resData = await response.json().catch(() => ({
        success: false,
        message: `HTTP ${response.status}: Failed to parse response.`,
      }));

      if (!response.ok) {
        if (response.status === 401 && currentUser) {
          currentUser = null;
          isAdmin = false;
          authToken = null;
          localStorage.removeItem("c23_auth_token");
          updateHeaderState();
        }
        return { data: null, error: resData.message || "An error occurred." };
      }

      return { data: resData.data, error: null };
    } catch (err) {
      return {
        data: null,
        error: "Network error: Unable to connect to Chapter 23 server.",
      };
    }
  }

  // Modal helpers
  function openCustomModal(contentMarkup, sizeClass = "") {
    if (modalDialogEl) {
      modalDialogEl.classList.remove("wide", "large");
      if (sizeClass) modalDialogEl.classList.add(sizeClass);
    }
    if (window.openModal) {
      window.openModal(contentMarkup);
    } else if (modalBodyEl && modalEl) {
      modalBodyEl.innerHTML = contentMarkup;
      modalEl.classList.add("open");
      document.body.style.overflow = "hidden";
    }
  }

  function setNotice(message, isError = false) {
    const el = document.getElementById("liveNotice");
    if (el) {
      el.innerHTML = `<p class="notice" role="status" style="color:${
        isError ? "#a33245" : "var(--wine)"
      };font-weight:500;margin:12px 0;">${esc(message)}</p>`;
    }
  }

  // Update header buttons
  function updateHeaderState() {
    if (!accountBtn) return;
    if (currentUser) {
      const firstName = currentUser.name
        ? currentUser.name.split(" ")[0]
        : "Account";
      accountBtn.textContent = `My Account (${esc(firstName)}) ↗`;
    } else {
      accountBtn.textContent = "Sign In ↗";
    }
    if (adminBtn) {
      adminBtn.hidden = !isAdmin;
    }
  }

  // Session bootstrap / verification
  async function refreshSession() {
    const { data, error } = await api("/auth/me");
    if (data && data.user) {
      currentUser = data.user;
      isAdmin = currentUser.role === "admin";
    } else {
      currentUser = null;
      isAdmin = false;
      authToken = null;
      localStorage.removeItem("c23_auth_token");
    }
    updateHeaderState();
  }

  // ==========================================
  // CUSTOMER AUTHENTICATION MODALS
  // ==========================================

  function showAuthModal(defaultTab = "login") {
    const isRegister = defaultTab === "register";

    openCustomModal(`
      <span class="micro">CHAPTER 23 / ACCOUNT</span>
      <h2>${isRegister ? "Start Your Archive" : "Welcome Back"}</h2>
      <p style="margin-bottom:18px;">${
        isRegister
          ? "Create your private account to commission bespoke magazines, schedule story interviews, and contribute photographs."
          : "Sign in to review your commissioned editions, access your scheduled video interviews, and view production progress."
      }</p>

      <div class="c23-tab-bar" style="margin-top:0;">
        <button class="c23-tab-btn ${!isRegister ? "active" : ""}" id="tabSignIn">Sign In</button>
        <button class="c23-tab-btn ${isRegister ? "active" : ""}" id="tabRegister">Create Account</button>
      </div>

      <div id="authFormArea">
        ${
          isRegister
            ? `
          <div class="c23-input-group">
            <label>Full Name</label>
            <input id="regName" type="text" autocomplete="name" required placeholder="E.g. Eleanor Vance">
          </div>
        `
            : ""
        }
        <div class="c23-input-group">
          <label>Email Address</label>
          <input id="authEmail" type="email" autocomplete="email" required placeholder="name@example.com">
        </div>
        <div class="c23-input-group">
          <label>Password</label>
          <input id="authPassword" type="password" autocomplete="${
            isRegister ? "new-password" : "current-password"
          }" required placeholder="Minimum 8 characters">
        </div>
        ${
          isRegister
            ? `
          <div class="c23-input-group">
            <label>Confirm Password</label>
            <input id="regConfirmPassword" type="password" autocomplete="new-password" required placeholder="Repeat password">
          </div>
        `
            : ""
        }

        <div style="margin-top:20px;">
          <button class="btn" id="authSubmitBtn" style="width:100%;justify-content:center;">
            ${isRegister ? "Create Customer Account ↗" : "Sign In to Chapter 23 ↗"}
          </button>
        </div>
        <div id="liveNotice"></div>
      </div>
    `);

    document.getElementById("tabSignIn").onclick = () => showAuthModal("login");
    document.getElementById("tabRegister").onclick = () => showAuthModal("register");

    document.getElementById("authSubmitBtn").onclick = async () => {
      const email = (document.getElementById("authEmail")?.value || "").trim();
      const password = document.getElementById("authPassword")?.value || "";

      if (!email || !password) {
        return setNotice("Please provide both email and password.", true);
      }
      if (password.length < 8) {
        return setNotice("Password must be at least 8 characters long.", true);
      }

      const submitBtn = document.getElementById("authSubmitBtn");
      submitBtn.disabled = true;
      submitBtn.textContent = "Please wait…";

      if (isRegister) {
        const name = (document.getElementById("regName")?.value || "").trim();
        const confirmPassword =
          document.getElementById("regConfirmPassword")?.value || "";

        if (!name) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Create Customer Account ↗";
          return setNotice("Please enter your full name.", true);
        }
        if (password !== confirmPassword) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Create Customer Account ↗";
          return setNotice("Passwords do not match.", true);
        }

        const { data, error } = await api("/auth/register", {
          method: "POST",
          body: JSON.stringify({ name, email, password, confirmPassword }),
        });

        if (error) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Create Customer Account ↗";
          return setNotice(error, true);
        }

        if (data && data.token) {
          authToken = data.token;
          localStorage.setItem("c23_auth_token", authToken);
          currentUser = data.user;
          isAdmin = currentUser.role === "admin";
          updateHeaderState();
          showCustomerAccount();
        }
      } else {
        const { data, error } = await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });

        if (error) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Sign In to Chapter 23 ↗";
          return setNotice(error, true);
        }

        if (data && data.token) {
          authToken = data.token;
          localStorage.setItem("c23_auth_token", authToken);
          currentUser = data.user;
          isAdmin = currentUser.role === "admin";
          updateHeaderState();
          showCustomerAccount();
        }
      }
    };
  }

  // ==========================================
  // CUSTOMER ACCOUNT PORTAL
  // ==========================================

  async function showCustomerAccount(activeTab = "orders") {
    if (!currentUser) return showAuthModal("login");

    // Fetch unread notifications count
    const notifRes = await api("/notifications");
    const unreadCount = notifRes.data?.unreadCount || 0;

    openCustomModal(`
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
        <div>
          <span class="micro">CUSTOMER ARCHIVE · THE MEMORY HOUSE</span>
          <h2 style="margin:5px 0 0;">Welcome, ${esc(currentUser.name || currentUser.email)}</h2>
        </div>
        <div>
          <button class="c23-small-btn outline" id="clientSignOutBtn">Log Out ↗</button>
        </div>
      </div>

      <div class="c23-tab-bar">
        <button class="c23-tab-btn ${activeTab === "orders" ? "active" : ""}" id="tabAccOrders">My Orders</button>
        <button class="c23-tab-btn ${activeTab === "profile" ? "active" : ""}" id="tabAccProfile">My Profile</button>
        <button class="c23-tab-btn ${activeTab === "notifications" ? "active" : ""}" id="tabAccNotifs">
          Notifications ${unreadCount > 0 ? `<span class="c23-badge-unread">${unreadCount}</span>` : ""}
        </button>
      </div>

      <div id="accountTabContent">
        <div style="padding:20px 0;text-align:center;"><p class="notice">Loading archive data…</p></div>
      </div>
      <div id="liveNotice"></div>
    `, "wide");

    document.getElementById("clientSignOutBtn").onclick = async () => {
      await api("/auth/logout", { method: "POST" });
      currentUser = null;
      isAdmin = false;
      authToken = null;
      localStorage.removeItem("c23_auth_token");
      updateHeaderState();
      if (window.closeModal) window.closeModal();
    };

    document.getElementById("tabAccOrders").onclick = () => renderCustomerOrdersTab();
    document.getElementById("tabAccProfile").onclick = () => renderCustomerProfileTab();
    document.getElementById("tabAccNotifs").onclick = () => renderCustomerNotificationsTab();

    if (activeTab === "orders") renderCustomerOrdersTab();
    else if (activeTab === "profile") renderCustomerProfileTab();
    else if (activeTab === "notifications") renderCustomerNotificationsTab();
  }

  // Tab: Customer Orders
  async function renderCustomerOrdersTab() {
    const container = document.getElementById("accountTabContent");
    if (!container) return;

    container.innerHTML = `<p class="notice">Retrieving your commissioned editions…</p>`;
    const { data: orders, error } = await api("/orders/my-orders");

    if (error) {
      container.innerHTML = `<div class="c23-notice-banner" style="border-color:#a33245;color:#a33245;">${esc(error)}</div>`;
      return;
    }

    if (!orders || orders.length === 0) {
      container.innerHTML = `
        <div class="c23-card" style="text-align:center;padding:40px 20px;">
          <h3 style="margin-bottom:8px;">No editions commissioned yet.</h3>
          <p style="max-width:440px;margin:0 auto 20px;color:var(--grey);font-size:13px;line-height:1.7;">
            Browse our Archive and select an edition to begin publishing your family, wedding, birthday, or legacy story.
          </p>
          <button class="btn" id="startFirstOrderBtn">Commission An Edition ↗</button>
        </div>
      `;
      const btn = document.getElementById("startFirstOrderBtn");
      if (btn) {
        btn.onclick = () => {
          if (window.closeModal) window.closeModal();
          location.hash = "#issues";
        };
      }
      return;
    }

    let html = `<div style="display:flex;flex-direction:column;gap:14px;">`;
    orders.forEach((o) => {
      const dateStr = new Date(o.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      html += `
        <div class="c23-card" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">
          <div style="flex:1;min-width:240px;">
            <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
              <span class="c23-status-badge ${getBadgeClass(o.status)}">${esc(o.status)}</span>
              <span class="c23-status-badge ${getBadgeClass(o.paymentStatus)}">Payment: ${esc(o.paymentStatus)}</span>
            </div>
            <h3 style="margin:0 0 4px;font-size:24px;">${esc(o.edition)}</h3>
            <p style="margin:0 0 8px;font-size:13px;color:var(--grey);">Occasion: <strong>${esc(o.occasion)}</strong> · Ordered: ${dateStr}</p>
            ${
              o.notes
                ? `<p style="margin:0;font-size:12px;color:#555;font-style:italic;">"${esc(o.notes)}"`
                : ""
            }
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
            <button class="btn c23-order-detail-btn" data-id="${o._id}" style="padding:10px 16px;font-size:10px;">
              Manage Edition & Media ↗
            </button>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;

    container.querySelectorAll(".c23-order-detail-btn").forEach((btn) => {
      btn.onclick = () => openCustomerOrderDetail(btn.dataset.id);
    });
  }

  // Customer Order Detail View (Interviews, Photos, Timeline)
  async function openCustomerOrderDetail(orderId) {
    openCustomModal(`
      <button class="c23-small-btn outline" id="backToOrdersBtn" style="margin-bottom:15px;">← Back to My Orders</button>
      <div id="orderDetailHost"><p class="notice">Loading edition details…</p></div>
    `, "wide");

    document.getElementById("backToOrdersBtn").onclick = () => showCustomerAccount("orders");

    const [orderRes, photosRes, slotsRes] = await Promise.all([
      api(`/orders/${orderId}`),
      api(`/orders/${orderId}/photos`),
      api("/interviews/available-slots"),
    ]);

    const host = document.getElementById("orderDetailHost");
    if (!host) return;

    if (orderRes.error) {
      host.innerHTML = `<div class="c23-notice-banner" style="color:#a33245;">${esc(orderRes.error)}</div>`;
      return;
    }

    const order = orderRes.data;
    const photos = photosRes.data || [];
    const availableSlots = slotsRes.data || [];
    const interview = order.interviewId;

    let content = `
      <div style="border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:20px;">
        <div style="display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap;">
          <span class="c23-status-badge ${getBadgeClass(order.status)}">${esc(order.status)}</span>
          <span class="c23-status-badge ${getBadgeClass(order.paymentStatus)}">Payment: ${esc(order.paymentStatus)}</span>
          <span class="micro" style="margin-left:auto;">ID: ${esc(order._id.slice(-8).toUpperCase())}</span>
        </div>
        <h2 style="margin:4px 0 6px;">${esc(order.edition)}</h2>
        <p style="margin:0;font-size:13px;color:var(--grey);">Occasion: <strong>${esc(order.occasion)}</strong> · Recipient: ${esc(order.customerName)}</p>
      </div>
    `;

    // SECTION 1: VIDEO INTERVIEW WORKFLOW
    content += `
      <div class="c23-card">
        <span class="micro" style="color:var(--wine);">STEP 1 · PERSONALIZED VIDEO INTERVIEW</span>
        <h3 style="margin-top:4px;">The Editorial Story Conversation</h3>
    `;

    if (!interview || interview.status === "Pending" || order.status === "Confirmed" || order.status === "Interview Pending") {
      content += `
        <p style="font-size:13px;line-height:1.7;color:#333;">
          Our creative director meets with you virtually to discover your core story, relationships, and memorable milestones before curating your magazine.
        </p>
        <div class="c23-notice-banner">
          <strong>Select an available video interview slot:</strong>
          <div style="margin-top:10px;">
            ${
              availableSlots.length > 0
                ? `
                <select id="slotSelect" style="padding:10px;width:100%;max-width:420px;border:1px solid #aaa;background:white;margin-bottom:12px;">
                  <option value="">-- Choose a convenient date and time --</option>
                  ${availableSlots
                    .map((s) => {
                      const d = new Date(s.startTime).toLocaleString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });
                      return `<option value="${s._id}">${d} (${s.durationMinutes} mins · ${esc(s.platform)})</option>`;
                    })
                    .join("")}
                </select>
                <div>
                  <button class="btn" id="confirmSlotBtn">Confirm Interview Booking ↗</button>
                </div>
              `
                : `
                <p class="notice" style="margin:0;">
                  Our editorial team is currently opening new interview slots for your edition. You will receive an email and notification as soon as slots are available.
                </p>
              `
            }
          </div>
        </div>
      `;
    } else if (interview.status === "Scheduled") {
      const schedTime = new Date(interview.scheduledAt).toLocaleString("en-US", {
        dateStyle: "full",
        timeStyle: "short",
      });
      content += `
        <div class="c23-notice-banner" style="border-color:#1c5b88;background:#edf5fa;">
          <p style="margin:0 0 6px;font-size:14px;color:#1c5b88;font-weight:600;">
            ✓ Your interview is confirmed for ${schedTime}
          </p>
          <p style="margin:0 0 14px;font-size:13px;color:#333;">
            Platform: <strong>${esc(interview.platform)}</strong>
          </p>
          <div class="c23-btn-row">
            ${
              interview.meetingUrl
                ? `<a href="${esc(interview.meetingUrl)}" target="_blank" rel="noopener noreferrer" class="btn" style="padding:10px 18px;font-size:11px;">Join Video Interview ↗</a>`
                : `<span class="notice">Meeting link will activate prior to your call.</span>`
            }
            <button class="c23-small-btn outline" id="clientReschedBtn">Request Reschedule</button>
          </div>
        </div>
      `;
    } else if (interview.status === "Reschedule Requested") {
      content += `
        <div class="c23-notice-banner" style="border-color:#b98e28;">
          <p style="margin:0;font-size:13px;color:#7d5e11;">
            A reschedule has been requested. Please choose an alternate slot above or wait for our team to contact you.
          </p>
        </div>
      `;
    } else if (interview.status === "Completed") {
      content += `
        <div class="c23-notice-banner" style="border-color:#236928;background:#eef6ee;">
          <p style="margin:0;font-size:13px;color:#236928;font-weight:500;">
            ✓ Video interview completed! Your story details and memory narrative have been captured.
          </p>
        </div>
      `;
    }

    content += `</div>`; // Close interview card

    // SECTION 2: PHOTO AND MEMORY COLLECTION
    content += `
      <div class="c23-card">
        <span class="micro" style="color:var(--wine);">STEP 2 · PHOTOGRAPHS & WRITTEN MEMORIES</span>
        <h3 style="margin-top:4px;">Your Personal Photographic Archive</h3>
        <p style="font-size:13px;line-height:1.7;color:#333;">
          Upload high-resolution photographs to be published in your magazine edition. Accompany each photograph with the date, individuals featured, and the heartfelt memory behind it.
        </p>

        <!-- Existing Photos Gallery -->
        <div style="margin:16px 0;">
          <h4 style="font-family:'DM Mono',monospace;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 10px;">
            Submitted Photographs (${photos.length})
          </h4>
    `;

    if (photos.length === 0) {
      content += `<p class="notice">No photographs submitted for this edition yet.</p>`;
    } else {
      content += `<div class="c23-grid-2">`;
      photos.forEach((p) => {
        content += `
          <div class="c23-photo-card">
            <div style="position:relative;margin-bottom:8px;">
              <img src="${esc(p.url)}" alt="Customer submitted memory" class="c23-photo-thumb" style="max-height:160px;object-fit:cover;">
              <span class="c23-status-badge ${getBadgeClass(p.status)}" style="position:absolute;top:6px;left:6px;">
                ${esc(p.status)}
              </span>
            </div>
            <div style="flex:1;">
              ${p.caption ? `<p style="margin:0 0 4px;font-size:13px;font-weight:600;">${esc(p.caption)}</p>` : ""}
              ${p.yearDate ? `<p style="margin:0 0 4px;font-size:11px;color:var(--grey);font-family:'DM Mono',monospace;">Date: ${esc(p.yearDate)}</p>` : ""}
              ${p.peopleShown ? `<p style="margin:0 0 4px;font-size:11px;color:var(--grey);">People: ${esc(p.peopleShown)}</p>` : ""}
              ${p.memoryDescription ? `<p style="margin:0 0 6px;font-size:12px;color:#444;line-height:1.5;">${esc(p.memoryDescription)}</p>` : ""}
              ${
                p.status === "Replacement Requested" && p.adminFeedback
                  ? `<div style="padding:8px;background:#fbeff1;border-left:2px solid #a33245;font-size:11px;color:#a33245;margin-top:6px;">
                      <strong>Editorial Feedback:</strong> ${esc(p.adminFeedback)}
                    </div>`
                  : ""
              }
            </div>
            ${
              p.status !== "Approved"
                ? `
              <div style="margin-top:8px;text-align:right;">
                <button class="c23-small-btn outline c23-delete-photo-btn" data-id="${p._id}" style="color:#a33245;border-color:#a33245;">
                  Delete Photo
                </button>
              </div>`
                : ""
            }
          </div>
        `;
      });
      content += `</div>`;
    }

    // Uploader Form
    content += `
      <div style="margin-top:24px;border-top:1px dashed var(--line);padding-top:20px;">
        <h4 style="font-family:'Instrument Serif',Georgia,serif;font-size:22px;margin:0 0 12px;font-weight:normal;">
          Add New Photographs & Stories
        </h4>

        <div class="c23-input-group">
          <label>Select Images (JPEG, PNG, WebP — Max 15MB each)</label>
          <input type="file" id="photoFilesInput" multiple accept="image/jpeg,image/png,image/webp">
        </div>

        <div id="photosStagingArea" style="margin-bottom:16px;"></div>

        <div class="c23-input-group">
          <label>Shared Story Notes or Editorial Directions (Optional)</label>
          <textarea id="sharedStoryNotes" rows="3" placeholder="Tell our editors anything important about the photo sequence or chapter organization…"></textarea>
        </div>

        <div>
          <button class="btn" id="uploadPhotosSubmitBtn" style="padding:14px 24px;">Upload Photographs & Memories ↗</button>
        </div>
        <div id="photoUploadNotice"></div>
      </div>
    `;

    content += `</div>`; // Close photo card

    host.innerHTML = content;

    // Attach slot booking click handler
    const confirmSlotBtn = document.getElementById("confirmSlotBtn");
    if (confirmSlotBtn) {
      confirmSlotBtn.onclick = async () => {
        const slotId = document.getElementById("slotSelect")?.value;
        if (!slotId) return alert("Please select a time slot from the list.");

        confirmSlotBtn.disabled = true;
        confirmSlotBtn.textContent = "Booking slot…";

        const { data, error } = await api("/interviews/book", {
          method: "POST",
          body: JSON.stringify({ slotId, orderId }),
        });

        if (error) {
          alert(error);
          confirmSlotBtn.disabled = false;
          confirmSlotBtn.textContent = "Confirm Interview Booking ↗";
        } else {
          alert("Your interview has been booked! Check your email and dashboard for meeting details.");
          openCustomerOrderDetail(orderId);
        }
      };
    }

    // Attach reschedule click handler
    const reschedBtn = document.getElementById("clientReschedBtn");
    if (reschedBtn && interview) {
      reschedBtn.onclick = async () => {
        const reason = prompt("Please let us know your preferred date or reason for rescheduling:");
        if (reason === null) return;

        const { error } = await api(`/interviews/${interview._id}/reschedule-request`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        });

        if (error) alert(error);
        else {
          alert("Reschedule request submitted. You may now pick a new slot.");
          openCustomerOrderDetail(orderId);
        }
      };
    }

    // Delete photo click handlers
    host.querySelectorAll(".c23-delete-photo-btn").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("Are you sure you want to remove this photograph?")) return;
        const { error } = await api(`/photos/${btn.dataset.id}`, { method: "DELETE" });
        if (error) alert(error);
        else openCustomerOrderDetail(orderId);
      };
    });

    // File selection & dynamic staging forms for individual captions/stories
    const fileInput = document.getElementById("photoFilesInput");
    const stagingArea = document.getElementById("photosStagingArea");
    let stagedFiles = [];

    if (fileInput && stagingArea) {
      fileInput.onchange = () => {
        stagedFiles = Array.from(fileInput.files);
        if (stagedFiles.length === 0) {
          stagingArea.innerHTML = "";
          return;
        }

        let stageHtml = `<div style="display:flex;flex-direction:column;gap:12px;">`;
        stagedFiles.forEach((file, idx) => {
          stageHtml += `
            <div style="border:1px solid #ccc;padding:12px;background:#fcfbf9;display:flex;gap:14px;flex-wrap:wrap;">
              <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--grey);width:100%;">
                PHOTO #${idx + 1}: ${esc(file.name)} (${(file.size / (1024 * 1024)).toFixed(2)} MB)
              </div>
              <div style="flex:1;min-width:180px;">
                <input class="stage-caption" data-idx="${idx}" placeholder="Photo caption / Title" style="width:100%;padding:8px;margin-bottom:6px;border:1px solid #aaa;font-size:12px;">
                <input class="stage-people" data-idx="${idx}" placeholder="People shown (optional)" style="width:100%;padding:8px;margin-bottom:6px;border:1px solid #aaa;font-size:12px;">
              </div>
              <div style="flex:1;min-width:180px;">
                <input class="stage-year" data-idx="${idx}" placeholder="Date / Year (e.g. Summer 2018)" style="width:100%;padding:8px;margin-bottom:6px;border:1px solid #aaa;font-size:12px;">
                <textarea class="stage-memory" data-idx="${idx}" rows="2" placeholder="Memory or story behind this photo" style="width:100%;padding:8px;border:1px solid #aaa;font-size:12px;"></textarea>
              </div>
            </div>
          `;
        });
        stageHtml += `</div>`;
        stagingArea.innerHTML = stageHtml;
      };
    }

    // Photo submit handler
    const uploadBtn = document.getElementById("uploadPhotosSubmitBtn");
    if (uploadBtn) {
      uploadBtn.onclick = async () => {
        if (!stagedFiles || stagedFiles.length === 0) {
          return alert("Please select at least one photograph to upload.");
        }

        const noticeEl = document.getElementById("photoUploadNotice");
        if (noticeEl) {
          noticeEl.innerHTML = `<p class="notice" style="color:var(--wine);margin-top:10px;">Uploading and optimizing ${stagedFiles.length} photo(s)… Please do not close this window.</p>`;
        }
        uploadBtn.disabled = true;

        const formData = new FormData();
        stagedFiles.forEach((f) => formData.append("photos", f));

        // Collect metadata array
        const metadata = stagedFiles.map((_, i) => ({
          caption: document.querySelector(`.stage-caption[data-idx="${i}"]`)?.value || "",
          peopleShown: document.querySelector(`.stage-people[data-idx="${i}"]`)?.value || "",
          yearDate: document.querySelector(`.stage-year[data-idx="${i}"]`)?.value || "",
          memoryDescription: document.querySelector(`.stage-memory[data-idx="${i}"]`)?.value || "",
          storyNotes: document.getElementById("sharedStoryNotes")?.value || "",
        }));

        formData.append("metadata", JSON.stringify(metadata));

        const { data, error } = await api(`/orders/${orderId}/photos`, {
          method: "POST",
          body: formData,
        });

        uploadBtn.disabled = false;
        if (error) {
          if (noticeEl) noticeEl.innerHTML = `<p class="notice" style="color:#a33245;margin-top:10px;">${esc(error)}</p>`;
        } else {
          alert(`${data.length} photograph(s) uploaded successfully!`);
          openCustomerOrderDetail(orderId);
        }
      };
    }
  }

  // Tab: Customer Profile
  async function renderCustomerProfileTab() {
    const container = document.getElementById("accountTabContent");
    if (!container) return;

    const { data: profile } = await api("/users/profile");
    const p = profile || currentUser;

    container.innerHTML = `
      <div class="c23-card" style="max-width:520px;">
        <h3>Profile Details</h3>
        <p style="font-size:13px;color:var(--grey);margin-bottom:18px;">
          Manage your personal Chapter 23 client information.
        </p>

        <div class="c23-input-group">
          <label>Full Name</label>
          <input id="editProfName" value="${esc(p.name || "")}" required>
        </div>
        <div class="c23-input-group">
          <label>Email Address</label>
          <input value="${esc(p.email || "")}" readonly style="background:#f4f1eb;cursor:not-allowed;">
        </div>
        <div class="c23-input-group">
          <label>Phone Number (Optional)</label>
          <input id="editProfPhone" value="${esc(p.phone || "")}" placeholder="+91 98765 43210">
        </div>

        <button class="btn" id="saveProfileBtn">Save Profile Updates ↗</button>
        <div id="liveNotice"></div>
      </div>
    `;

    document.getElementById("saveProfileBtn").onclick = async () => {
      const name = document.getElementById("editProfName").value.trim();
      const phone = document.getElementById("editProfPhone").value.trim();

      if (!name) return setNotice("Full name is required.", true);

      const { data, error } = await api("/users/profile", {
        method: "PATCH",
        body: JSON.stringify({ name, phone }),
      });

      if (error) setNotice(error, true);
      else {
        currentUser.name = name;
        currentUser.phone = phone;
        updateHeaderState();
        setNotice("Profile saved successfully!");
      }
    };
  }

  // Tab: Customer Notifications Feed
  async function renderCustomerNotificationsTab() {
    const container = document.getElementById("accountTabContent");
    if (!container) return;

    const { data, error } = await api("/notifications");
    if (error) {
      container.innerHTML = `<div class="c23-notice-banner" style="color:#a33245;">${esc(error)}</div>`;
      return;
    }

    const notifs = data?.notifications || [];

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <span class="micro">YOUR NOTIFICATIONS FEED</span>
        ${notifs.length > 0 ? `<button class="c23-small-btn outline" id="markAllReadBtn">Mark all as read</button>` : ""}
      </div>
    `;

    if (notifs.length === 0) {
      html += `<div class="c23-card"><p class="notice" style="margin:0;">No notifications yet.</p></div>`;
    } else {
      html += `<div style="display:flex;flex-direction:column;gap:10px;">`;
      notifs.forEach((n) => {
        const time = new Date(n.createdAt).toLocaleString();
        html += `
          <div class="c23-card" style="margin:0;padding:14px 18px;border-left:${n.isRead ? "1px solid var(--line)" : "3px solid var(--wine)"};background:${n.isRead ? "white" : "#faf7f2"};">
            <div style="display:flex;justify-content:space-between;gap:10px;">
              <strong style="font-size:14px;color:${n.isRead ? "var(--ink)" : "var(--wine)"};">${esc(n.title)}</strong>
              <small class="micro" style="color:var(--grey);">${time}</small>
            </div>
            <p style="margin:6px 0 0;font-size:13px;line-height:1.6;color:#333;">${esc(n.message)}</p>
          </div>
        `;
      });
      html += `</div>`;
    }

    container.innerHTML = html;

    const markAllBtn = document.getElementById("markAllReadBtn");
    if (markAllBtn) {
      markAllBtn.onclick = async () => {
        await api("/notifications/read-all", { method: "POST" });
        renderCustomerNotificationsTab();
      };
    }
  }

  // ==========================================
  // PRIVATE ADMIN STUDIO DASHBOARD
  // ==========================================

  async function showAdminDashboard(activeTab = "orders") {
    if (!currentUser || !isAdmin) {
      alert("Access restricted to authorized Chapter 23 administrators.");
      return;
    }

    openCustomModal(`
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div>
          <span class="micro" style="color:var(--wine);">CHAPTER 23 STUDIO · ADMIN CONSOLE</span>
          <h2 style="margin:4px 0 0;">Studio Operations</h2>
        </div>
        <div>
          <button class="c23-small-btn outline" id="adminRefreshBtn">Refresh Data ⟳</button>
        </div>
      </div>

      <div id="adminMetricsArea" style="margin:16px 0 20px;"></div>

      <div class="c23-tab-bar">
        <button class="c23-tab-btn ${activeTab === "orders" ? "active" : ""}" id="admTabOrders">Orders</button>
        <button class="c23-tab-btn ${activeTab === "customers" ? "active" : ""}" id="admTabCustomers">Customers</button>
        <button class="c23-tab-btn ${activeTab === "interviews" ? "active" : ""}" id="admTabInterviews">Video Interviews</button>
        <button class="c23-tab-btn ${activeTab === "logins" ? "active" : ""}" id="admTabLogins">Sign-in Audit</button>
      </div>

      <div id="adminViewArea"><p class="notice">Loading studio operations…</p></div>
      <div id="liveNotice"></div>
    `, "large");

    document.getElementById("adminRefreshBtn").onclick = () => showAdminDashboard(activeTab);

    document.getElementById("admTabOrders").onclick = () => {
      setActiveAdminTab("admTabOrders");
      renderAdminOrdersView();
    };
    document.getElementById("admTabCustomers").onclick = () => {
      setActiveAdminTab("admTabCustomers");
      renderAdminCustomersView();
    };
    document.getElementById("admTabInterviews").onclick = () => {
      setActiveAdminTab("admTabInterviews");
      renderAdminInterviewsView();
    };
    document.getElementById("admTabLogins").onclick = () => {
      setActiveAdminTab("admTabLogins");
      renderAdminLoginsView();
    };

    // Load top metrics
    loadAdminMetrics();

    // Render active tab
    if (activeTab === "orders") renderAdminOrdersView();
    else if (activeTab === "customers") renderAdminCustomersView();
    else if (activeTab === "interviews") renderAdminInterviewsView();
    else if (activeTab === "logins") renderAdminLoginsView();
  }

  function setActiveAdminTab(tabBtnId) {
    document.querySelectorAll(".c23-tab-bar .c23-tab-btn").forEach((b) => b.classList.remove("active"));
    const b = document.getElementById(tabBtnId);
    if (b) b.classList.add("active");
  }

  async function loadAdminMetrics() {
    const area = document.getElementById("adminMetricsArea");
    if (!area) return;

    const { data } = await api("/admin/dashboard");
    if (!data || !data.metrics) return;

    const m = data.metrics;
    area.innerHTML = `
      <div class="c23-grid-4">
        <div class="c23-metric-box">
          <div class="c23-metric-num">${m.totalCustomers}</div>
          <div class="c23-metric-label">Registered Customers</div>
        </div>
        <div class="c23-metric-box">
          <div class="c23-metric-num">${m.totalOrders}</div>
          <div class="c23-metric-label">Total Orders</div>
        </div>
        <div class="c23-metric-box">
          <div class="c23-metric-num">${m.newRequests}</div>
          <div class="c23-metric-label">New Requests</div>
        </div>
        <div class="c23-metric-box">
          <div class="c23-metric-num">${m.confirmedOrders}</div>
          <div class="c23-metric-label">Confirmed Orders</div>
        </div>
        <div class="c23-metric-box">
          <div class="c23-metric-num">${m.pendingPayments}</div>
          <div class="c23-metric-label">Pending Payments</div>
        </div>
        <div class="c23-metric-box">
          <div class="c23-metric-num">${m.upcomingInterviews}</div>
          <div class="c23-metric-label">Upcoming Interviews</div>
        </div>
        <div class="c23-metric-box">
          <div class="c23-metric-num">${m.pendingPhotos}</div>
          <div class="c23-metric-label">Pending Photos</div>
        </div>
        <div class="c23-metric-box">
          <div class="c23-metric-num">${m.completedOrders}</div>
          <div class="c23-metric-label">Completed Editions</div>
        </div>
      </div>
    `;
  }

  // Admin View: Orders Management
  async function renderAdminOrdersView() {
    const view = document.getElementById("adminViewArea");
    if (!view) return;

    view.innerHTML = `<p class="notice">Loading orders…</p>`;
    const { data: orders, error } = await api("/orders");

    if (error) {
      view.innerHTML = `<div class="c23-notice-banner" style="color:#a33245;">${esc(error)}</div>`;
      return;
    }

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
        <span class="micro">ALL ORDERS (${orders?.length || 0})</span>
        <input id="adminOrderSearch" placeholder="Search customer, edition, occasion…" style="max-width:300px;padding:8px 12px;font-size:12px;border:1px solid #aaa;">
      </div>
      <div class="c23-table-wrap">
        <table class="c23-table" id="adminOrdersTable">
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Edition / Occasion</th>
              <th>Order Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    (orders || []).forEach((o) => {
      const d = new Date(o.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      html += `
        <tr data-search="${esc(o.customerName)} ${esc(o.customerEmail)} ${esc(o.edition)} ${esc(o.occasion)}">
          <td>${d}</td>
          <td>
            <strong>${esc(o.customerName)}</strong><br>
            <small style="color:var(--grey);">${esc(o.customerEmail)}</small>
          </td>
          <td>
            <strong>${esc(o.edition)}</strong><br>
            <small style="color:var(--grey);">${esc(o.occasion)}</small>
          </td>
          <td><span class="c23-status-badge ${getBadgeClass(o.status)}">${esc(o.status)}</span></td>
          <td><span class="c23-status-badge ${getBadgeClass(o.paymentStatus)}">${esc(o.paymentStatus)}</span></td>
          <td>
            <button class="c23-small-btn c23-adm-inspect-order" data-id="${o._id}">Manage Order ↗</button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
    view.innerHTML = html;

    // Filter search handler
    const searchInput = document.getElementById("adminOrderSearch");
    if (searchInput) {
      searchInput.oninput = () => {
        const query = searchInput.value.toLowerCase().trim();
        document.querySelectorAll("#adminOrdersTable tbody tr").forEach((tr) => {
          const text = (tr.dataset.search || "").toLowerCase();
          tr.style.display = text.includes(query) ? "" : "none";
        });
      };
    }

    view.querySelectorAll(".c23-adm-inspect-order").forEach((btn) => {
      btn.onclick = () => openAdminOrderInspector(btn.dataset.id);
    });
  }

  // Admin: Comprehensive Order Inspector & Status Updater
  async function openAdminOrderInspector(orderId) {
    openCustomModal(`
      <button class="c23-small-btn outline" id="backToAdminOrdersBtn" style="margin-bottom:15px;">← Back to Orders List</button>
      <div id="adminOrderInspectorHost"><p class="notice">Loading order details…</p></div>
    `, "large");

    document.getElementById("backToAdminOrdersBtn").onclick = () => showAdminDashboard("orders");

    const [orderRes, photosRes, histRes, notesRes] = await Promise.all([
      api(`/orders/${orderId}`),
      api(`/orders/${orderId}/photos`),
      api(`/orders/${orderId}/history`),
      api(`/interviews/admin/${orderId}/notes`),
    ]);

    const host = document.getElementById("adminOrderInspectorHost");
    if (!host) return;

    if (orderRes.error) {
      host.innerHTML = `<div class="c23-notice-banner" style="color:#a33245;">${esc(orderRes.error)}</div>`;
      return;
    }

    const order = orderRes.data;
    const photos = photosRes.data || [];
    const history = histRes.data || [];
    const notesData = notesRes.data?.answers || {};

    const ORDER_STATUSES = [
      "Requested",
      "Under Review",
      "Confirmed",
      "Interview Pending",
      "Interview Scheduled",
      "Interview Completed",
      "Photos Pending",
      "Photos Received",
      "In Production",
      "Shipped",
      "Completed",
      "Cancelled",
    ];

    const PAYMENT_STATUSES = ["Pending", "Awaiting Verification", "Paid", "Refunded"];

    let html = `
      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;border-bottom:1px solid var(--line);padding-bottom:16px;margin-bottom:20px;">
        <div>
          <span class="micro">ORDER RECORD · ${esc(order._id.slice(-8).toUpperCase())}</span>
          <h2 style="margin:4px 0 4px;">${esc(order.edition)}</h2>
          <p style="margin:0;font-size:13px;color:var(--grey);">
            Customer: <strong>${esc(order.customerName)}</strong> (${esc(order.customerEmail)}) · Occasion: ${esc(order.occasion)}
          </p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span class="c23-status-badge ${getBadgeClass(order.status)}">${esc(order.status)}</span>
          <span class="c23-status-badge ${getBadgeClass(order.paymentStatus)}">${esc(order.paymentStatus)}</span>
        </div>
      </div>

      <div class="c23-grid-2">
        <!-- Column 1: Status Controls & Internal Notes -->
        <div>
          <div class="c23-card">
            <h3>Update Status & Payment</h3>

            <div class="c23-input-group">
              <label>Order Workflow Status</label>
              <select id="admUpdateOrderStatus">
                ${ORDER_STATUSES.map(
                  (s) => `<option value="${s}" ${order.status === s ? "selected" : ""}>${s}</option>`
                ).join("")}
              </select>
            </div>

            <div class="c23-input-group">
              <label>Payment Verification Status</label>
              <select id="admUpdatePaymentStatus">
                ${PAYMENT_STATUSES.map(
                  (p) => `<option value="${p}" ${order.paymentStatus === p ? "selected" : ""}>${p}</option>`
                ).join("")}
              </select>
            </div>

            <div class="c23-input-group">
              <label>Status Change Audit Note (Optional)</label>
              <input id="admStatusChangeNote" placeholder="E.g. Verified bank UPI transfer #1234">
            </div>

            <button class="btn" id="admSaveStatusBtn" style="padding:12px 20px;">Save Status Changes ↗</button>
            <div id="admStatusSaveNotice"></div>
          </div>

          <div class="c23-card">
            <h3>Internal Editorial Notes</h3>
            <div class="c23-input-group">
              <label>Private Team Notes</label>
              <textarea id="admInternalNotesArea" rows="4" placeholder="Special printing instructions, family preferences, notes…">${esc(order.internalNotes || "")}</textarea>
            </div>
            <button class="c23-small-btn" id="admSaveInternalNotesBtn">Save Internal Notes</button>
          </div>

          <!-- Customer Order Notes -->
          <div class="c23-card">
            <h3>Customer's Submitted Story</h3>
            <p style="font-size:13px;line-height:1.7;color:#333;font-style:italic;">
              ${order.notes ? esc(order.notes) : "No initial notes provided."}
            </p>
          </div>
        </div>

        <!-- Column 2: Interview Questionnaire & Photo Review -->
        <div>
          <!-- Questionnaire Card -->
          <div class="c23-card">
            <span class="micro" style="color:var(--wine);">INTERVIEW QUESTIONNAIRE & STORY NOTES</span>
            <h3 style="margin-top:4px;">Memories & Core Narrative</h3>
            <p style="font-size:12px;color:var(--grey);margin-bottom:12px;">
              Document key answers collected during the video interview with the customer.
            </p>

            <div class="c23-input-group">
              <label>1. What makes this occasion special?</label>
              <textarea id="qOccasionSpecial" rows="2">${esc(notesData.occasionSpecial || "")}</textarea>
            </div>

            <div class="c23-input-group">
              <label>2. Key People in the story & their roles?</label>
              <textarea id="qKeyPeople" rows="2">${esc(notesData.keyPeople || "")}</textarea>
            </div>

            <div class="c23-input-group">
              <label>3. Most memorable moments & anecdotes?</label>
              <textarea id="qMemorableMoments" rows="2">${esc(notesData.memorableMoments || "")}</textarea>
            </div>

            <div class="c23-input-group">
              <label>4. Key emotions the magazine should evoke?</label>
              <textarea id="qEmotions" rows="2">${esc(notesData.emotions || "")}</textarea>
            </div>

            <div class="c23-input-group">
              <label>5. Memories that should never be forgotten?</label>
              <textarea id="qMemoriesNeverForget" rows="2">${esc(notesData.memoriesNeverForget || "")}</textarea>
            </div>

            <div class="c23-input-group">
              <label>6. Important dates or milestones?</label>
              <input id="qMilestones" value="${esc(notesData.milestones || "")}">
            </div>

            <div class="c23-input-group">
              <label>7. Final message or dedication for magazine?</label>
              <textarea id="qFinalMessage" rows="2">${esc(notesData.finalMessage || "")}</textarea>
            </div>

            <button class="btn" id="admSaveQuestionnaireBtn" style="padding:12px 20px;">Save Interview Notes ↗</button>
            <div id="admNotesSaveNotice"></div>
          </div>
        </div>
      </div>

      <!-- Full-Width Photo & Memory Review Section -->
      <div class="c23-card" style="margin-top:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
          <div>
            <span class="micro" style="color:var(--wine);">CUSTOMER PHOTOGRAPHS (${photos.length})</span>
            <h3 style="margin:4px 0 0;">Photo & Memory Curation</h3>
          </div>
          <div class="c23-btn-row">
            <button class="c23-small-btn outline" id="admRequestMorePhotosBtn">Request Additional Photos</button>
            <button class="btn" id="admMarkCollectionReceivedBtn" style="padding:10px 16px;font-size:11px;">
              Mark Collection As Received ↗
            </button>
          </div>
        </div>

        ${
          photos.length === 0
            ? `<p class="notice">No photographs uploaded yet by customer.</p>`
            : `<div class="c23-grid-2">` +
              photos
                .map(
                  (p) => `
              <div class="c23-photo-card">
                <a href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">
                  <img src="${esc(p.url)}" alt="Customer photograph" class="c23-photo-thumb" style="max-height:180px;object-fit:cover;">
                </a>
                <div style="margin-top:8px;flex:1;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                    <span class="c23-status-badge ${getBadgeClass(p.status)}">${esc(p.status)}</span>
                    <small class="micro">${esc(p.originalName)}</small>
                  </div>
                  ${p.caption ? `<p style="margin:4px 0;font-size:13px;font-weight:600;">${esc(p.caption)}</p>` : ""}
                  ${p.yearDate ? `<p style="margin:2px 0;font-size:11px;color:var(--grey);">Date: ${esc(p.yearDate)}</p>` : ""}
                  ${p.peopleShown ? `<p style="margin:2px 0;font-size:11px;color:var(--grey);">People: ${esc(p.peopleShown)}</p>` : ""}
                  ${p.memoryDescription ? `<p style="margin:6px 0;font-size:12px;color:#333;line-height:1.5;">${esc(p.memoryDescription)}</p>` : ""}
                  ${p.adminFeedback ? `<p style="margin:6px 0;font-size:11px;color:#a33245;background:#fbeff1;padding:6px;">Feedback: ${esc(p.adminFeedback)}</p>` : ""}
                </div>

                <div class="c23-btn-row" style="margin-top:10px;">
                  <button class="c23-small-btn c23-adm-approve-photo" data-id="${p._id}">Approve</button>
                  <button class="c23-small-btn outline c23-adm-reject-photo" data-id="${p._id}">Request Replacement</button>
                  <a href="${esc(p.url)}" download="${esc(p.originalName)}" target="_blank" class="c23-small-btn outline">Download</a>
                </div>
              </div>
            `
                )
                .join("") +
              `</div>`
        }
      </div>

      <!-- Order Status History Audit Trail -->
      <div class="c23-card" style="margin-top:20px;">
        <h3>Order Audit History</h3>
        <div class="c23-table-wrap">
          <table class="c23-table">
            <thead>
              <tr>
                <th>Date / Time</th>
                <th>Changed By</th>
                <th>Status Progression</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              ${
                history.length === 0
                  ? `<tr><td colspan="4" class="notice">No history events recorded yet.</td></tr>`
                  : history
                      .map((h) => {
                        const time = new Date(h.createdAt).toLocaleString();
                        const who = h.changedByUserId?.name || h.changedByRole || "System";
                        return `
                    <tr>
                      <td>${time}</td>
                      <td>${esc(who)}</td>
                      <td>
                        ${h.previousStatus ? `${esc(h.previousStatus)} → ` : ""}<strong>${esc(h.newStatus || order.status)}</strong>
                        ${h.newPaymentStatus ? `<br><small>Payment: ${esc(h.newPaymentStatus)}</small>` : ""}
                      </td>
                      <td>${esc(h.note || "—")}</td>
                    </tr>
                  `;
                      })
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    host.innerHTML = html;

    // Attach Status Save button
    document.getElementById("admSaveStatusBtn").onclick = async () => {
      const newStatus = document.getElementById("admUpdateOrderStatus").value;
      const newPayment = document.getElementById("admUpdatePaymentStatus").value;
      const note = document.getElementById("admStatusChangeNote").value.trim();

      const btn = document.getElementById("admSaveStatusBtn");
      btn.disabled = true;
      btn.textContent = "Saving…";

      const [sRes, pRes] = await Promise.all([
        newStatus !== order.status
          ? api(`/orders/${orderId}/status`, {
              method: "PATCH",
              body: JSON.stringify({ status: newStatus, internalNote: note }),
            })
          : Promise.resolve({ error: null }),
        newPayment !== order.paymentStatus
          ? api(`/orders/${orderId}/payment`, {
              method: "PATCH",
              body: JSON.stringify({ paymentStatus: newPayment, internalNote: note }),
            })
          : Promise.resolve({ error: null }),
      ]);

      btn.disabled = false;
      btn.textContent = "Save Status Changes ↗";

      if (sRes.error || pRes.error) {
        alert(sRes.error || pRes.error);
      } else {
        alert("Status updated successfully!");
        openAdminOrderInspector(orderId);
      }
    };

    // Attach Internal Notes Save button
    document.getElementById("admSaveInternalNotesBtn").onclick = async () => {
      const internalNotes = document.getElementById("admInternalNotesArea").value;
      const { error } = await api(`/orders/${orderId}/internal-notes`, {
        method: "PATCH",
        body: JSON.stringify({ internalNotes }),
      });
      if (error) alert(error);
      else alert("Internal notes saved.");
    };

    // Attach Questionnaire Save button
    document.getElementById("admSaveQuestionnaireBtn").onclick = async () => {
      const answers = {
        occasionSpecial: document.getElementById("qOccasionSpecial")?.value || "",
        keyPeople: document.getElementById("qKeyPeople")?.value || "",
        memorableMoments: document.getElementById("qMemorableMoments")?.value || "",
        emotions: document.getElementById("qEmotions")?.value || "",
        memoriesNeverForget: document.getElementById("qMemoriesNeverForget")?.value || "",
        milestones: document.getElementById("qMilestones")?.value || "",
        finalMessage: document.getElementById("qFinalMessage")?.value || "",
      };

      const btn = document.getElementById("admSaveQuestionnaireBtn");
      btn.disabled = true;
      btn.textContent = "Saving questionnaire…";

      const { error } = await api("/interviews/admin/notes", {
        method: "POST",
        body: JSON.stringify({ orderId, answers }),
      });

      btn.disabled = false;
      btn.textContent = "Save Interview Notes ↗";

      if (error) alert(error);
      else alert("Interview questionnaire notes saved.");
    };

    // Individual Photo Approval
    host.querySelectorAll(".c23-adm-approve-photo").forEach((btn) => {
      btn.onclick = async () => {
        const { error } = await api(`/photos/admin/photos/${btn.dataset.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "Approved" }),
        });
        if (error) alert(error);
        else openAdminOrderInspector(orderId);
      };
    });

    // Individual Photo Replacement Request
    host.querySelectorAll(".c23-adm-reject-photo").forEach((btn) => {
      btn.onclick = async () => {
        const feedback = prompt("Enter specific feedback or reason for requesting a replacement:");
        if (feedback === null) return;

        const { error } = await api(`/photos/admin/photos/${btn.dataset.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: "Replacement Requested", adminFeedback: feedback }),
        });
        if (error) alert(error);
        else openAdminOrderInspector(orderId);
      };
    });

    // Request Additional Photos
    const reqMoreBtn = document.getElementById("admRequestMorePhotosBtn");
    if (reqMoreBtn) {
      reqMoreBtn.onclick = async () => {
        const msg = prompt("Enter instructions for the additional photographs needed:");
        if (msg === null) return;

        const { error } = await api(`/photos/admin/orders/${orderId}/request-photos`, {
          method: "POST",
          body: JSON.stringify({ message: msg }),
        });
        if (error) alert(error);
        else alert("Customer has been notified to provide additional photographs.");
      };
    }

    // Mark Photo Collection Received
    const markRecBtn = document.getElementById("admMarkCollectionReceivedBtn");
    if (markRecBtn) {
      markRecBtn.onclick = async () => {
        if (!confirm("Mark the complete photo collection as received and advance order to Photos Received?")) return;

        const { error } = await api(`/photos/admin/orders/${orderId}/mark-photos-received`, {
          method: "POST",
        });
        if (error) alert(error);
        else {
          alert("Photo collection marked as received!");
          openAdminOrderInspector(orderId);
        }
      };
    }
  }

  // Admin View: Customers Management
  async function renderAdminCustomersView() {
    const view = document.getElementById("adminViewArea");
    if (!view) return;

    view.innerHTML = `<p class="notice">Loading customer archives…</p>`;
    const { data: customers, error } = await api("/admin/customers");

    if (error) {
      view.innerHTML = `<div class="c23-notice-banner" style="color:#a33245;">${esc(error)}</div>`;
      return;
    }

    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
        <span class="micro">REGISTERED CLIENT ARCHIVES (${customers?.length || 0})</span>
        <input id="adminCustomerSearch" placeholder="Search by name, email, phone…" style="max-width:300px;padding:8px 12px;font-size:12px;border:1px solid #aaa;">
      </div>
      <div class="c23-table-wrap">
        <table class="c23-table" id="adminCustomersTable">
          <thead>
            <tr>
              <th>Registered</th>
              <th>Customer Name</th>
              <th>Email & Contact</th>
              <th>Orders</th>
              <th>Latest Order Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
    `;

    (customers || []).forEach((c) => {
      const d = new Date(c.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      html += `
        <tr data-search="${esc(c.name)} ${esc(c.email)} ${esc(c.phone || "")}">
          <td>${d}</td>
          <td><strong>${esc(c.name)}</strong></td>
          <td>
            ${esc(c.email)}
            ${c.phone ? `<br><small style="color:var(--grey);">${esc(c.phone)}</small>` : ""}
          </td>
          <td><strong>${c.orderCount || 0}</strong></td>
          <td>
            ${
              c.latestOrder
                ? `<span class="c23-status-badge ${getBadgeClass(c.latestOrder.status)}">${esc(c.latestOrder.status)}</span><br><small>${esc(c.latestOrder.edition)}</small>`
                : `<span class="notice">None</span>`
            }
          </td>
          <td>
            <button class="c23-small-btn c23-inspect-customer" data-id="${c._id}">Inspect Customer ↗</button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;
    view.innerHTML = html;

    const searchInput = document.getElementById("adminCustomerSearch");
    if (searchInput) {
      searchInput.oninput = () => {
        const query = searchInput.value.toLowerCase().trim();
        document.querySelectorAll("#adminCustomersTable tbody tr").forEach((tr) => {
          const text = (tr.dataset.search || "").toLowerCase();
          tr.style.display = text.includes(query) ? "" : "none";
        });
      };
    }

    view.querySelectorAll(".c23-inspect-customer").forEach((btn) => {
      btn.onclick = () => openAdminCustomerDetails(btn.dataset.id);
    });
  }

  // Admin View: Customer Detailed Inspector
  async function openAdminCustomerDetails(customerId) {
    openCustomModal(`
      <button class="c23-small-btn outline" id="backToCustListBtn" style="margin-bottom:15px;">← Back to Customers</button>
      <div id="adminCustDetailHost"><p class="notice">Loading customer profile…</p></div>
    `, "large");

    document.getElementById("backToCustListBtn").onclick = () => showAdminDashboard("customers");

    const { data, error } = await api(`/admin/customers/${customerId}`);
    const host = document.getElementById("adminCustDetailHost");
    if (!host) return;

    if (error) {
      host.innerHTML = `<div class="c23-notice-banner" style="color:#a33245;">${esc(error)}</div>`;
      return;
    }

    const { customer, orders, signIns } = data;
    const regDate = new Date(customer.createdAt).toLocaleString();

    host.innerHTML = `
      <div style="border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:18px;">
        <span class="micro">CLIENT DOSSIER</span>
        <h2 style="margin:4px 0 2px;">${esc(customer.name)}</h2>
        <p style="margin:0;font-size:13px;color:var(--grey);">
          Email: ${esc(customer.email)} · Phone: ${esc(customer.phone || "Not specified")} · Registered: ${regDate}
        </p>
      </div>

      <div class="c23-grid-2">
        <div class="c23-card">
          <h3>Customer Orders (${orders.length})</h3>
          ${
            orders.length === 0
              ? `<p class="notice">No orders placed by this customer.</p>`
              : orders
                  .map(
                    (o) => `
                <div style="border-bottom:1px solid var(--line);padding:10px 0;">
                  <div style="display:flex;justify-content:space-between;">
                    <strong>${esc(o.edition)}</strong>
                    <span class="c23-status-badge ${getBadgeClass(o.status)}">${esc(o.status)}</span>
                  </div>
                  <small style="color:var(--grey);">Occasion: ${esc(o.occasion)} · Payment: ${esc(o.paymentStatus)}</small>
                </div>
              `
                  )
                  .join("")
          }
        </div>

        <div class="c23-card">
          <h3>Recent Sign-in History</h3>
          <div class="c23-table-wrap">
            <table class="c23-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                ${
                  signIns.length === 0
                    ? `<tr><td colspan="2" class="notice">No recorded sign-ins.</td></tr>`
                    : signIns
                        .map(
                          (s) => `
                      <tr>
                        <td>${new Date(s.createdAt).toLocaleString()}</td>
                        <td>${esc(s.ipAddress || "Local / Proxy")}</td>
                      </tr>
                    `
                        )
                        .join("")
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  // Admin View: Video Interview Slots & Scheduling
  async function renderAdminInterviewsView() {
    const view = document.getElementById("adminViewArea");
    if (!view) return;

    view.innerHTML = `<p class="notice">Loading interview slots and schedules…</p>`;
    const { data: slots, error } = await api("/interviews/admin/slots");

    if (error) {
      view.innerHTML = `<div class="c23-notice-banner" style="color:#a33245;">${esc(error)}</div>`;
      return;
    }

    let html = `
      <div class="c23-grid-2">
        <!-- Create Slot Form -->
        <div class="c23-card">
          <span class="micro" style="color:var(--wine);">CREATE CALENDAR AVAILABILITY</span>
          <h3 style="margin-top:4px;">New Interview Slot</h3>

          <div class="c23-input-group">
            <label>Start Date & Time</label>
            <input type="datetime-local" id="slotStartTime" required>
          </div>

          <div class="c23-input-group">
            <label>Duration (Minutes)</label>
            <input type="number" id="slotDuration" value="45" min="15" max="180">
          </div>

          <div class="c23-input-group">
            <label>Meeting Platform</label>
            <select id="slotPlatform">
              <option value="Google Meet">Google Meet</option>
              <option value="Zoom">Zoom</option>
              <option value="Custom">Custom Platform</option>
            </select>
          </div>

          <div class="c23-input-group">
            <label>Private Meeting Link / URL</label>
            <input id="slotMeetingUrl" placeholder="https://meet.google.com/abc-defg-hij">
          </div>

          <button class="btn" id="admCreateSlotBtn" style="padding:12px 20px;">Publish Available Slot ↗</button>
          <div id="admSlotCreateNotice"></div>
        </div>

        <!-- Slot Information & Guide -->
        <div class="c23-card">
          <h3>Video Interview Protocol</h3>
          <p style="font-size:13px;line-height:1.7;color:#333;">
            Personalized interviews are the heartbeat of Chapter 23. Confirmed customers view your published slots in their account portal and book the time that suits them best.
          </p>
          <div class="c23-notice-banner">
            <strong>Meeting URL Strategy:</strong>
            <p style="margin:4px 0 0;font-size:12px;">
              Create your room in Google Meet or Zoom, paste the invite link here, and Chapter 23 will safely deliver the meeting link to the customer upon booking.
            </p>
          </div>
        </div>
      </div>

      <!-- Published Slots Table -->
      <div class="c23-card" style="margin-top:20px;">
        <span class="micro">ALL CREATED SLOTS (${slots?.length || 0})</span>
        <h3 style="margin-top:4px;">Available & Booked Slots</h3>

        <div class="c23-table-wrap">
          <table class="c23-table">
            <thead>
              <tr>
                <th>Scheduled Time</th>
                <th>Duration</th>
                <th>Platform</th>
                <th>Status</th>
                <th>Booked Client & Edition</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (!slots || slots.length === 0) {
      html += `<tr><td colspan="6" class="notice">No interview slots created yet. Use the form above to add available times.</td></tr>`;
    } else {
      slots.forEach((s) => {
        const time = new Date(s.startTime).toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        html += `
          <tr>
            <td><strong>${time}</strong></td>
            <td>${s.durationMinutes} mins</td>
            <td>${esc(s.platform)}</td>
            <td>
              <span class="c23-status-badge ${s.isBooked ? "badge-confirmed" : "badge-requested"}">
                ${s.isBooked ? "Booked" : "Available"}
              </span>
            </td>
            <td>
              ${
                s.isBooked
                  ? `<strong>${esc(s.bookedByUserId?.name || "Client")}</strong><br><small>${esc(s.bookedForOrderId?.edition || "")}</small>`
                  : "—"
              }
            </td>
            <td>
              ${
                !s.isBooked
                  ? `<button class="c23-small-btn outline c23-delete-slot-btn" data-id="${s._id}" style="color:#a33245;border-color:#a33245;">Delete</button>`
                  : s.meetingUrl
                  ? `<a href="${esc(s.meetingUrl)}" target="_blank" class="c23-small-btn">Join Call</a>`
                  : `<span class="notice">Booked</span>`
              }
            </td>
          </tr>
        `;
      });
    }

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    view.innerHTML = html;

    // Attach create slot handler
    document.getElementById("admCreateSlotBtn").onclick = async () => {
      const startTime = document.getElementById("slotStartTime").value;
      const duration = parseInt(document.getElementById("slotDuration").value, 10) || 45;
      const platform = document.getElementById("slotPlatform").value;
      const meetingUrl = document.getElementById("slotMeetingUrl").value.trim();

      if (!startTime) return alert("Please specify the slot start date and time.");

      const btn = document.getElementById("admCreateSlotBtn");
      btn.disabled = true;
      btn.textContent = "Publishing…";

      const { error } = await api("/interviews/admin/slots", {
        method: "POST",
        body: JSON.stringify({ startTime, durationMinutes: duration, platform, meetingUrl }),
      });

      btn.disabled = false;
      btn.textContent = "Publish Available Slot ↗";

      if (error) alert(error);
      else {
        alert("Interview slot published!");
        renderAdminInterviewsView();
      }
    };

    // Attach delete slot handlers
    view.querySelectorAll(".c23-delete-slot-btn").forEach((btn) => {
      btn.onclick = async () => {
        if (!confirm("Are you sure you want to remove this unbooked slot?")) return;
        const { error } = await api(`/interviews/admin/slots/${btn.dataset.id}`, {
          method: "DELETE",
        });
        if (error) alert(error);
        else renderAdminInterviewsView();
      };
    });
  }

  // Admin View: Sign-in Audit History
  async function renderAdminLoginsView() {
    const view = document.getElementById("adminViewArea");
    if (!view) return;

    view.innerHTML = `<p class="notice">Loading sign-in audit logs…</p>`;
    const { data: events, error } = await api("/admin/logins");

    if (error) {
      view.innerHTML = `<div class="c23-notice-banner" style="color:#a33245;">${esc(error)}</div>`;
      return;
    }

    let html = `
      <div class="c23-card">
        <span class="micro">SECURITY & ACCESS CONTROL</span>
        <h3 style="margin-top:4px;">Recent Recorded Sign-in Events</h3>
        <p style="font-size:12px;color:var(--grey);margin-bottom:14px;">
          Displays sign-in events authenticated across Chapter 23 customer and administrator sessions.
        </p>

        <div class="c23-table-wrap">
          <table class="c23-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User Account</th>
                <th>Role</th>
                <th>IP Address</th>
                <th>User Agent</th>
              </tr>
            </thead>
            <tbody>
    `;

    if (!events || events.length === 0) {
      html += `<tr><td colspan="5" class="notice">No login events recorded.</td></tr>`;
    } else {
      events.forEach((ev) => {
        const time = new Date(ev.createdAt).toLocaleString();
        const role = ev.userId?.role || "customer";
        html += `
          <tr>
            <td>${time}</td>
            <td>
              <strong>${esc(ev.userId?.name || ev.email)}</strong><br>
              <small style="color:var(--grey);">${esc(ev.email)}</small>
            </td>
            <td><span class="c23-status-badge ${role === "admin" ? "badge-completed" : "badge-requested"}">${esc(role)}</span></td>
            <td>${esc(ev.ipAddress || "Local / Same-host")}</td>
            <td><small style="color:var(--grey);">${esc((ev.userAgent || "").slice(0, 50))}</small></td>
          </tr>
        `;
      });
    }

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    view.innerHTML = html;
  }

  // ==========================================
  // ORDER REQUEST / ENQUIRY INTEGRATION
  // ==========================================

  function handleEnquiry(name = "A personalized edition") {
    if (!currentUser) {
      showAuthModal("login");
      setTimeout(() => {
        setNotice("Please sign in or create an account to commission an edition.", false);
      }, 50);
      return;
    }

    openCustomModal(`
      <span class="micro">CHAPTER 23 / COMMISSION AN EDITION</span>
      <h2>Start your chapter.</h2>
      <p style="font-size:13px;line-height:1.7;margin-bottom:18px;">
        Submit your bespoke magazine request. Our creative director will review your details, confirm availability, and prepare your personal video interview schedule.
      </p>

      <div class="c23-input-group">
        <label>Your Name</label>
        <input id="enqCustName" value="${esc(currentUser.name || "")}" required placeholder="Full name">
      </div>

      <div class="c23-input-group">
        <label>Contact Email</label>
        <input id="enqCustEmail" type="email" value="${esc(currentUser.email || "")}" readonly style="background:#f4f1eb;cursor:not-allowed;">
      </div>

      <div class="c23-input-group">
        <label>Occasion</label>
        <input id="enqOccasion" maxlength="120" required placeholder="Birthday, wedding, anniversary, graduation, family legacy…">
      </div>

      <div class="c23-input-group">
        <label>Selected Edition / Collection</label>
        <input id="enqEdition" maxlength="160" value="${esc(name)}">
      </div>

      <div class="c23-input-group">
        <label>Tell Us Your Story & Vision</label>
        <textarea id="enqStory" rows="4" placeholder="Recipient, relationship, milestone date, personality traits, design thoughts…"></textarea>
      </div>

      <button class="btn" id="submitEnquiryOrderBtn" style="width:100%;justify-content:center;">
        Submit Commission Request ↗
      </button>
      <div id="liveNotice"></div>
    `);

    document.getElementById("submitEnquiryOrderBtn").onclick = async () => {
      const customerName = document.getElementById("enqCustName")?.value.trim();
      const occasion = document.getElementById("enqOccasion")?.value.trim();
      const edition = document.getElementById("enqEdition")?.value.trim();
      const notes = document.getElementById("enqStory")?.value.trim();

      if (!occasion || !edition) {
        return setNotice("Please complete both the Occasion and Edition fields.", true);
      }

      const btn = document.getElementById("submitEnquiryOrderBtn");
      btn.disabled = true;
      btn.textContent = "Submitting to Chapter 23 Archive…";

      const { data, error } = await api("/orders", {
        method: "POST",
        body: JSON.stringify({ customerName, occasion, edition, notes }),
      });

      if (error) {
        btn.disabled = false;
        btn.textContent = "Submit Commission Request ↗";
        return setNotice(error, true);
      }

      openCustomModal(`
        <span class="micro">CHAPTER 23 / ARCHIVE CONFIRMED</span>
        <h2>Your Edition Is Commissioned.</h2>
        <p style="font-size:14px;line-height:1.7;">
          Your order request <strong>${esc(data._id.slice(-8).toUpperCase())}</strong> for <em>${esc(data.edition)}</em> has been saved to MongoDB.
        </p>
        <p style="font-size:13px;color:var(--grey);line-height:1.7;">
          Our creative team will review your submission and confirm your edition. You will receive an invitation to select your personal video interview time slot.
        </p>
        <div style="margin-top:24px;">
          <button class="btn" id="openOrdersFromSuccessBtn">View My Orders Archive ↗</button>
        </div>
      `);

      document.getElementById("openOrdersFromSuccessBtn").onclick = () => {
        showCustomerAccount("orders");
      };
    };
  }

  // ==========================================
  // INITIALIZATION & EVENT LISTENERS
  // ==========================================

  // Hook navigation buttons
  if (accountBtn) {
    accountBtn.onclick = () => {
      if (currentUser) showCustomerAccount();
      else showAuthModal("login");
    };
  }

  if (adminBtn) {
    adminBtn.onclick = () => showAdminDashboard("orders");
  }

  // Hook existing enquiry trigger buttons across index.html
  document.querySelectorAll(".enquire").forEach((b) => {
    b.onclick = () => handleEnquiry(b.dataset.pack);
  });

  const startEnquiryBtn = document.getElementById("startEnquiry");
  if (startEnquiryBtn) {
    startEnquiryBtn.onclick = () => handleEnquiry("Personalized Edition");
  }

  // Hook magazine cover preview modal inquiry button
  const originalShowIssue = window.showIssue;
  if (originalShowIssue) {
    window.showIssue = function (e) {
      originalShowIssue(e);
      const issueBtn = document.getElementById("issueEnquiry");
      if (issueBtn) {
        issueBtn.onclick = () => handleEnquiry(e.title);
      }
    };
  }

  // Check existing session on load
  refreshSession();
})();
