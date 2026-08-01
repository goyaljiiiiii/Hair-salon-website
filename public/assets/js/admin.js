// Admin Dashboard Logic - Maison de Beauté

document.addEventListener("DOMContentLoaded", () => {
    // Session state
    let cachedBookings = [];
    let cachedStylists = [];
    let cachedServices = [];

    // Top Level Elements
    const loggedAdminUserSpan = document.getElementById("logged-admin-user");
    const adminLogoutBtn = document.getElementById("admin-logout-btn");
    const toast = document.getElementById("toast");

    // Metrics Elements
    const metricTotal = document.getElementById("metric-total");
    const metricPending = document.getElementById("metric-pending");
    const metricRevenue = document.getElementById("metric-revenue");
    const metricStylists = document.getElementById("metric-stylists");

    // Search & Filter Elements
    const searchBookingsInput = document.getElementById("search-bookings-input");
    const filterDate = document.getElementById("filter-date");
    const filterStylist = document.getElementById("filter-stylist");
    const filterStatus = document.getElementById("filter-status");
    const bookingsTableBody = document.getElementById("bookings-table-body");
    const exportCsvBtn = document.getElementById("export-csv-btn");

    // Modal Container
    const modalOverlay = document.getElementById("modal-overlay");
    const modalCard = document.getElementById("modal-card");

    // Catalog Managers Containers
    const servicesListContainer = document.getElementById("services-list-container");
    const stylistsListContainer = document.getElementById("stylists-list-container");

    // Forms
    const addServiceForm = document.getElementById("add-service-form");
    const addStylistForm = document.getElementById("add-stylist-form");
    const changePasswordForm = document.getElementById("change-password-form");

    // Check Admin Session Status on load
    async function checkAuth() {
        try {
            const res = await fetch("/api/admin/status");
            const data = await res.json();
            
            if (!data.loggedIn) {
                window.location.href = "login.html";
            } else {
                loggedAdminUserSpan.textContent = `Logged in as: ${data.username}`;
                initializeDashboard();
            }
        } catch (err) {
            console.error("Auth status verification failed:", err);
            window.location.href = "login.html";
        }
    }

    // Initialize Dashboard data loading
    async function initializeDashboard() {
        setupTabs();
        await refreshCatalogs(); 
        await refreshBookings(); 
        await loadAnalytics();
        setupForms();
        setupFilters();
        setupExportCSV();
    }

    // Toast Notification helper
    function showToast(message, type = "success") {
        if (!toast) return;
        toast.textContent = message;
        toast.className = `notification-toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove("show");
        }, 3500);
    }

    // Tab Navigation setup
    function setupTabs() {
        const tabs = document.querySelectorAll(".tab-btn");
        const sections = document.querySelectorAll(".tab-content");

        tabs.forEach(tab => {
            tab.addEventListener("click", () => {
                const targetTabId = tab.dataset.tab;

                tabs.forEach(t => t.classList.remove("active"));
                sections.forEach(s => s.classList.remove("active"));

                tab.classList.add("active");
                const targetSection = document.getElementById(targetTabId);
                if (targetSection) targetSection.classList.add("active");
            });
        });
    }

    // Modal Helpers
    function closeModal() {
        if (modalOverlay) {
            modalOverlay.classList.remove("active");
            modalCard.innerHTML = "";
        }
    }

    if (modalOverlay) {
        modalOverlay.addEventListener("click", (e) => {
            if (e.target === modalOverlay) closeModal();
        });
    }

    function showConfirmModal(title, text, onConfirm) {
        if (!modalOverlay || !modalCard) return;
        modalCard.innerHTML = `
            <button class="close-modal-btn" id="modal-close">&times;</button>
            <h3 style="font-size: 1.25rem; color: #fcd34d; margin-bottom: 0.5rem; font-family: 'Playfair Display', serif;">${title}</h3>
            <p style="color: #d1d5db; font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem;">${text}</p>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button id="modal-cancel-btn" style="padding: 8px 16px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: white; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancel</button>
                <button id="modal-confirm-btn" style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">Confirm Action</button>
            </div>
        `;
        modalOverlay.classList.add("active");

        document.getElementById("modal-close").addEventListener("click", closeModal);
        document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
        document.getElementById("modal-confirm-btn").addEventListener("click", async () => {
            closeModal();
            await onConfirm();
        });
    }

    function openReceiptModal(booking) {
        if (!modalOverlay || !modalCard) return;
        const [year, month, day] = booking.booking_date.split("-");
        const dateObj = new Date(year, month - 1, day);
        const readableDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        const readableTime = formatTimeLabel(booking.booking_time);

        modalCard.innerHTML = `
            <button class="close-modal-btn" id="modal-close">&times;</button>
            <div class="receipt-header">
                <h3>Maison de Beauté</h3>
                <div class="receipt-ref">RESERVATION RECEIPT &bull; #MDB-${booking.id}</div>
            </div>
            
            <div class="receipt-detail-row">
                <span>Client Name:</span>
                <span>${booking.customer_name}</span>
            </div>
            <div class="receipt-detail-row">
                <span>Email:</span>
                <span>${booking.customer_email}</span>
            </div>
            <div class="receipt-detail-row">
                <span>Phone:</span>
                <span>${booking.customer_phone}</span>
            </div>
            <div class="receipt-detail-row">
                <span>Selected Service:</span>
                <span>${booking.service_name} ($${booking.service_price.toFixed(2)})</span>
            </div>
            <div class="receipt-detail-row">
                <span>Stylist:</span>
                <span>${booking.stylist_name}</span>
            </div>
            <div class="receipt-detail-row">
                <span>Schedule:</span>
                <span>${readableDate} @ ${readableTime}</span>
            </div>
            <div class="receipt-detail-row">
                <span>Add-ons:</span>
                <span>${booking.add_ons || 'None'}</span>
            </div>
            <div class="receipt-detail-row">
                <span>Promo Code:</span>
                <span>${booking.promo_code || 'None'}</span>
            </div>
            <div class="receipt-detail-row receipt-total-row">
                <span>Total Amount:</span>
                <span>$${booking.total_price.toFixed(2)}</span>
            </div>

            <button class="print-btn" onclick="window.print()">🖨️ Print Customer Receipt</button>
        `;
        modalOverlay.classList.add("active");
        document.getElementById("modal-close").addEventListener("click", closeModal);
    }

    // Forms event handlers
    function setupForms() {
        if (adminLogoutBtn) {
            adminLogoutBtn.addEventListener("click", async () => {
                try {
                    const res = await fetch("/api/admin/logout", { method: "POST" });
                    if (res.ok) {
                        window.location.href = "/";
                    } else {
                        showToast("Logout failed.", "error");
                    }
                } catch (e) {
                    showToast("Server communication issue.", "error");
                }
            });
        }

        if (addServiceForm) {
            addServiceForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const name = document.getElementById("service-name").value.trim();
                const price = parseFloat(document.getElementById("service-price").value);
                const duration = parseInt(document.getElementById("service-duration").value);
                const description = document.getElementById("service-desc").value.trim();

                try {
                    const res = await fetch("/api/admin/services", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name, price, duration, description })
                    });
                    const data = await res.json();

                    if (res.ok) {
                        showToast(`Service "${name}" added successfully.`);
                        addServiceForm.reset();
                        await refreshCatalogs();
                        await loadAnalytics();
                    } else {
                        showToast(data.error || "Failed to add service.", "error");
                    }
                } catch (err) {
                    showToast("Failed to communicate with server.", "error");
                }
            });
        }

        if (addStylistForm) {
            addStylistForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const name = document.getElementById("stylist-name").value.trim();
                const specialty = document.getElementById("stylist-specialty").value.trim();
                const image_url = document.getElementById("stylist-image").value.trim();

                try {
                    const res = await fetch("/api/admin/stylists", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name, specialty, image_url })
                    });
                    const data = await res.json();

                    if (res.ok) {
                        showToast(`Stylist "${name}" added successfully.`);
                        addStylistForm.reset();
                        document.getElementById("stylist-image").value = "assets/images/logo.png";
                        await refreshCatalogs();
                    } else {
                        showToast(data.error || "Failed to add stylist.", "error");
                    }
                } catch (err) {
                    showToast("Failed to communicate with server.", "error");
                }
            });
        }

        if (changePasswordForm) {
            changePasswordForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const oldPassword = document.getElementById("old-password").value;
                const newPassword = document.getElementById("new-password").value;
                const newPasswordConfirm = document.getElementById("new-password-confirm").value;

                if (newPassword !== newPasswordConfirm) {
                    showToast("New passwords do not match.", "error");
                    return;
                }

                try {
                    const res = await fetch("/api/admin/change-password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ oldPassword, newPassword })
                    });
                    const data = await res.json();

                    if (res.ok) {
                        showToast("Password updated successfully.");
                        changePasswordForm.reset();
                    } else {
                        showToast(data.error || "Failed to change password.", "error");
                    }
                } catch (err) {
                    showToast("Server request failed.", "error");
                }
            });
        }
    }

    // Refresh catalogs
    async function refreshCatalogs() {
        try {
            const stylistRes = await fetch("/api/stylists");
            cachedStylists = await stylistRes.json();
            
            const serviceRes = await fetch("/api/services");
            cachedServices = await serviceRes.json();

            renderServices();
            renderStylists();
            updateFilterDropdowns();
            
            if (metricStylists) metricStylists.textContent = cachedStylists.length;
        } catch (err) {
            console.error("Error updating catalogs:", err);
            showToast("Error updating catalog listings.", "error");
        }
    }

    function updateFilterDropdowns() {
        if (!filterStylist) return;
        filterStylist.innerHTML = '<option value="">All Stylists</option>';
        cachedStylists.forEach(stylist => {
            const opt = document.createElement("option");
            opt.value = stylist.name;
            opt.textContent = stylist.name;
            filterStylist.appendChild(opt);
        });
    }

    function renderServices() {
        if (!servicesListContainer) return;
        servicesListContainer.innerHTML = "";

        if (cachedServices.length === 0) {
            servicesListContainer.innerHTML = '<p style="color: #888; font-style: italic;">No services configured.</p>';
            return;
        }

        cachedServices.forEach(service => {
            const item = document.createElement("div");
            item.className = "catalog-item";
            item.innerHTML = `
                <div class="catalog-item-info">
                    <h4>${service.name}</h4>
                    <p>$${service.price.toFixed(2)} &bull; ${service.duration} mins</p>
                </div>
                <button class="delete-icon-btn" title="Delete Service" data-id="${service.id}">&times;</button>
            `;

            item.querySelector(".delete-icon-btn").addEventListener("click", () => {
                deleteService(service.id, service.name);
            });

            servicesListContainer.appendChild(item);
        });
    }

    function renderStylists() {
        if (!stylistsListContainer) return;
        stylistsListContainer.innerHTML = "";

        if (cachedStylists.length === 0) {
            stylistsListContainer.innerHTML = '<p style="color: #888; font-style: italic;">No stylists configured.</p>';
            return;
        }

        cachedStylists.forEach(stylist => {
            const item = document.createElement("div");
            item.className = "catalog-item";
            item.innerHTML = `
                <div class="catalog-item-info">
                    <h4>${stylist.name}</h4>
                    <p>${stylist.specialty}</p>
                </div>
                <button class="delete-icon-btn" title="Delete Stylist" data-id="${stylist.id}">&times;</button>
            `;

            item.querySelector(".delete-icon-btn").addEventListener("click", () => {
                deleteStylist(stylist.id, stylist.name);
            });

            stylistsListContainer.appendChild(item);
        });
    }

    function deleteService(id, name) {
        showConfirmModal(
            "Delete Service",
            `Are you sure you want to remove service "${name}"?`,
            async () => {
                try {
                    const res = await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
                    const data = await res.json();

                    if (res.ok) {
                        showToast(`Service "${name}" was deleted.`);
                        await refreshCatalogs();
                        await refreshBookings();
                        await loadAnalytics();
                    } else {
                        showToast(data.error || "Failed to delete service.", "error");
                    }
                } catch (e) {
                    showToast("Server request failed.", "error");
                }
            }
        );
    }

    function deleteStylist(id, name) {
        showConfirmModal(
            "Delete Stylist",
            `Are you sure you want to remove stylist "${name}"?`,
            async () => {
                try {
                    const res = await fetch(`/api/admin/stylists/${id}`, { method: "DELETE" });
                    const data = await res.json();

                    if (res.ok) {
                        showToast(`Stylist "${name}" was deleted.`);
                        await refreshCatalogs();
                        await refreshBookings();
                    } else {
                        showToast(data.error || "Failed to delete stylist.", "error");
                    }
                } catch (e) {
                    showToast("Server request failed.", "error");
                }
            }
        );
    }

    function setupFilters() {
        if (searchBookingsInput) searchBookingsInput.addEventListener("input", renderBookings);
        if (filterDate) filterDate.addEventListener("input", renderBookings);
        if (filterStylist) filterStylist.addEventListener("change", renderBookings);
        if (filterStatus) filterStatus.addEventListener("change", renderBookings);
    }

    async function refreshBookings() {
        try {
            const res = await fetch("/api/admin/bookings");
            if (res.ok) {
                cachedBookings = await res.json();
                renderBookings();
                calculateMetrics();
            } else {
                bookingsTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #ff5555;">Unauthorized access. Please log in again.</td></tr>';
            }
        } catch (err) {
            console.error("Error retrieving bookings:", err);
            bookingsTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #ff5555;">Server communications error.</td></tr>';
        }
    }

    function formatTimeLabel(timeStr) {
        if (!timeStr) return "";
        const [hour, minute] = timeStr.split(":").map(Number);
        const ampm = hour >= 12 ? "PM" : "AM";
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${minute < 10 ? "0" + minute : minute} ${ampm}`;
    }

    // Render bookings table filtered locally
    function renderBookings() {
        if (!bookingsTableBody) return;
        bookingsTableBody.innerHTML = "";

        const searchQuery = searchBookingsInput ? searchBookingsInput.value.toLowerCase().trim() : "";
        const dateVal = filterDate.value;
        const stylistVal = filterStylist.value;
        const statusVal = filterStatus.value;

        const filtered = cachedBookings.filter(b => {
            if (searchQuery) {
                const matchName = b.customer_name.toLowerCase().includes(searchQuery);
                const matchEmail = b.customer_email.toLowerCase().includes(searchQuery);
                const matchPhone = b.customer_phone.toLowerCase().includes(searchQuery);
                const matchId = `mdb-${b.id}`.includes(searchQuery) || b.id.toString() === searchQuery;
                if (!matchName && !matchEmail && !matchPhone && !matchId) return false;
            }
            if (dateVal && b.booking_date !== dateVal) return false;
            if (stylistVal && b.stylist_name !== stylistVal) return false;
            if (statusVal && b.status !== statusVal) return false;
            return true;
        });

        if (filtered.length === 0) {
            bookingsTableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #888; font-style: italic; padding: 2rem;">No matching appointments found.</td></tr>';
            calculateCommissions();
            return;
        }

        filtered.forEach(booking => {
            const tr = document.createElement("tr");
            
            const [year, month, day] = booking.booking_date.split("-");
            const dateObj = new Date(year, month - 1, day);
            const readableDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            const readableTime = formatTimeLabel(booking.booking_time);

            tr.innerHTML = `
                <td>
                    <div style="font-size: 0.75rem; color: #fcd34d; font-weight: 700; letter-spacing: 0.5px;">#MDB-${booking.id}</div>
                    <div style="font-weight: bold; color: white;">${booking.customer_name}</div>
                </td>
                <td>
                    <div style="font-size: 0.85rem;">${booking.customer_email}</div>
                    <div style="font-size: 0.85rem; color: #aaa;">${booking.customer_phone}</div>
                </td>
                <td>
                    <div style="font-weight: 500;">${booking.service_name}</div>
                    <div style="font-size: 0.8rem; color: #888;">$${booking.service_price.toFixed(2)}</div>
                </td>
                <td>
                    <div style="font-size: 0.85rem; color: #ddd;">${booking.add_ons || 'None'}</div>
                </td>
                <td>
                    <div style="font-weight: 700; color: var(--status-completed);">$${booking.total_price.toFixed(2)}</div>
                </td>
                <td>
                    <div>${booking.stylist_name}</div>
                </td>
                <td>
                    <div>${readableDate}</div>
                    <div style="font-size: 0.8rem; color: #ccc;">${readableTime}</div>
                </td>
                <td>
                    <span class="badge ${booking.status}">${booking.status}</span>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <select class="action-select" data-id="${booking.id}">
                            <option value="pending" ${booking.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="confirmed" ${booking.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                            <option value="completed" ${booking.status === 'completed' ? 'selected' : ''}>Completed</option>
                            <option value="cancelled" ${booking.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                        <button class="receipt-btn" title="View Receipt" style="background: rgba(192, 132, 252, 0.15); border: 1px solid rgba(192, 132, 252, 0.3); color: #c084fc; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;">🧾</button>
                        <button class="delete-icon-btn" title="Delete Booking" data-id="${booking.id}">&times;</button>
                    </div>
                </td>
            `;

            tr.querySelector(".action-select").addEventListener("change", async (e) => {
                await updateBookingStatus(booking.id, e.target.value);
            });

            tr.querySelector(".receipt-btn").addEventListener("click", () => {
                openReceiptModal(booking);
            });

            tr.querySelector(".delete-icon-btn").addEventListener("click", async () => {
                await deleteBooking(booking.id, booking.customer_name);
            });

            bookingsTableBody.appendChild(tr);
        });

        calculateCommissions();
    }

    // CSV Export Setup
    function setupExportCSV() {
        if (!exportCsvBtn) return;
        exportCsvBtn.addEventListener("click", () => {
            if (cachedBookings.length === 0) {
                showToast("No bookings to export.", "error");
                return;
            }

            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Booking ID,Customer Name,Email,Phone,Service,Stylist,Date,Time,Status,Total Price\n";

            cachedBookings.forEach(b => {
                const row = [
                    `"MDB-${b.id}"`,
                    `"${b.customer_name.replace(/"/g, '""')}"`,
                    `"${b.customer_email}"`,
                    `"${b.customer_phone}"`,
                    `"${b.service_name}"`,
                    `"${b.stylist_name}"`,
                    `"${b.booking_date}"`,
                    `"${b.booking_time}"`,
                    `"${b.status}"`,
                    `"${b.total_price.toFixed(2)}"`
                ].join(",");
                csvContent += row + "\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `maison_de_beaute_bookings_${new Date().toISOString().slice(0,10)}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast("CSV report generated successfully!");
        });
    }

    // Calculate commissions
    function calculateCommissions() {
        const commissionsTableBody = document.getElementById("commissions-table-body");
        if (!commissionsTableBody) return;
        commissionsTableBody.innerHTML = "";

        if (cachedStylists.length === 0) {
            commissionsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #888; font-style: italic;">No stylists configured.</td></tr>';
            return;
        }

        cachedStylists.forEach(stylist => {
            const completedBookings = cachedBookings.filter(b => b.stylist_id === stylist.id && b.status === "completed");
            
            const completedCount = completedBookings.length;
            const totalServiceSales = completedBookings.reduce((sum, b) => sum + Number(b.service_price), 0);
            const commissionPayout = totalServiceSales * 0.50;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><div style="font-weight: bold; color: white;">${stylist.name}</div></td>
                <td><div style="font-size: 0.85rem; color: #aaa;">${stylist.specialty}</div></td>
                <td><div>${completedCount} sessions</div></td>
                <td><div style="font-weight: 600; color: var(--status-completed);">$${totalServiceSales.toFixed(2)}</div></td>
                <td><div style="font-weight: 700; color: var(--gold); text-shadow: 0 0 5px rgba(252,211,77,0.2);">$${commissionPayout.toFixed(2)}</div></td>
            `;
            commissionsTableBody.appendChild(tr);
        });
    }

    // Analytics Chart Loader
    async function loadAnalytics() {
        const chartBarsContainer = document.getElementById("chart-bars");
        if (!chartBarsContainer) return;

        try {
            const res = await fetch("/api/admin/analytics");
            if (!res.ok) return;

            const data = await res.json();
            chartBarsContainer.innerHTML = "";

            if (!data.popularServices || data.popularServices.length === 0) {
                chartBarsContainer.innerHTML = '<p style="color: #888; font-style: italic;">No analytics available yet.</p>';
                return;
            }

            const maxBookings = Math.max(...data.popularServices.map(s => s.total_bookings), 1);

            data.popularServices.forEach(s => {
                const percentage = Math.round((s.total_bookings / maxBookings) * 100);
                const row = document.createElement("div");
                row.className = "chart-row";
                row.innerHTML = `
                    <div class="chart-meta">
                        <span>${s.name}</span>
                        <span>${s.total_bookings} Bookings ($${s.revenue.toFixed(2)})</span>
                    </div>
                    <div class="chart-bar-bg">
                        <div class="chart-bar-fill" style="width: 0%;"></div>
                    </div>
                `;
                chartBarsContainer.appendChild(row);

                setTimeout(() => {
                    row.querySelector(".chart-bar-fill").style.width = `${Math.max(percentage, 8)}%`;
                }, 100);
            });
        } catch (err) {
            console.error("Error loading analytics:", err);
        }
    }

    async function updateBookingStatus(id, newStatus) {
        try {
            const res = await fetch(`/api/admin/bookings/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();

            if (res.ok) {
                showToast(`Appointment status updated to ${newStatus}.`);
                await refreshBookings();
                await loadAnalytics();
            } else {
                showToast(data.error || "Failed to update booking status.", "error");
            }
        } catch (e) {
            showToast("Server communication error.", "error");
        }
    }

    function deleteBooking(id, customerName) {
        showConfirmModal(
            "Delete Booking",
            `Are you sure you want to delete the reservation for "${customerName}"?`,
            async () => {
                try {
                    const res = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
                    const data = await res.json();

                    if (res.ok) {
                        showToast("Booking deleted successfully.");
                        await refreshBookings();
                        await loadAnalytics();
                    } else {
                        showToast(data.error || "Failed to delete booking.", "error");
                    }
                } catch (e) {
                    showToast("Server communication error.", "error");
                }
            }
        );
    }

    function calculateMetrics() {
        if (cachedBookings.length === 0) {
            if (metricTotal) metricTotal.textContent = 0;
            if (metricPending) metricPending.textContent = 0;
            if (metricRevenue) metricRevenue.textContent = "$0.00";
            return;
        }

        const total = cachedBookings.length;
        const pending = cachedBookings.filter(b => b.status === "pending").length;
        const revenue = cachedBookings
            .filter(b => b.status === "completed")
            .reduce((sum, b) => sum + (b.total_price || 0), 0);

        if (metricTotal) metricTotal.textContent = total;
        if (metricPending) metricPending.textContent = pending;
        if (metricRevenue) metricRevenue.textContent = `$${revenue.toFixed(2)}`;
    }

    checkAuth();
});
