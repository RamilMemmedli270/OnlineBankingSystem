let usersData = [];
let accountsData = [];
let loansData = [];

document.addEventListener("DOMContentLoaded", function () {
    const token = getAuthToken();

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    const roles = getAuthRoles();
    if (!roles.includes("Admin")) {
        window.location.href = "dashboard.html";
        return;
    }

    // User Profile in Navbar & Sidebar
    const fullName = getAuthFullName();
    const avatarLetter = fullName.charAt(0).toUpperCase();

    const topAvatar = document.getElementById("topAvatar") || document.getElementById("userAvatar");
    const headerFullName = document.getElementById("headerFullName") || document.getElementById("userFullName");
    const fullNameDisplay = document.getElementById("fullNameDisplay");
    const sidebarRole = document.getElementById("sidebarRole") || document.getElementById("userRole");

    if (topAvatar) topAvatar.textContent = avatarLetter;
    if (headerFullName) headerFullName.textContent = fullName;
    if (fullNameDisplay) fullNameDisplay.textContent = fullName;
    if (sidebarRole) sidebarRole.textContent = "Sistem Admini";

    const logoutAction = (e) => {
        e.preventDefault();
        clearAuth();
        window.location.href = "index.html";
    };

    const logoutBtn = document.getElementById("logoutBtn");
    const dashLogoutBtn = document.getElementById("dashLogoutBtn");
    const dropdownLogoutBtn = document.getElementById("dropdownLogoutBtn");

    if (logoutBtn) logoutBtn.addEventListener("click", logoutAction);
    if (dashLogoutBtn) dashLogoutBtn.addEventListener("click", logoutAction);
    if (dropdownLogoutBtn) dropdownLogoutBtn.addEventListener("click", logoutAction);



    // Tab Event Listeners
    const tabUsers = document.getElementById("tabUsers");
    const tabAccounts = document.getElementById("tabAccounts");
    const tabLoans = document.getElementById("tabLoans");

    if (tabUsers) tabUsers.addEventListener("click", () => switchTab("users"));
    if (tabAccounts) tabAccounts.addEventListener("click", () => switchTab("accounts"));
    if (tabLoans) tabLoans.addEventListener("click", () => switchTab("loans"));

    // Search inputs
    const usersSearch = document.getElementById("usersSearch");
    const accountsSearch = document.getElementById("accountsSearch");
    const loansSearch = document.getElementById("loansSearch");

    if (usersSearch) usersSearch.addEventListener("input", filterUsers);
    if (accountsSearch) accountsSearch.addEventListener("input", filterAccounts);
    if (loansSearch) loansSearch.addEventListener("input", filterLoans);

    loadUsers();
    loadMetricsSummary();

    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    if (tabParam && ["users", "accounts", "loans"].includes(tabParam)) {
        switchTab(tabParam);
    }
});

function switchTab(tab) {
    const tabUsers = document.getElementById("tabUsers");
    const tabAccounts = document.getElementById("tabAccounts");
    const tabLoans = document.getElementById("tabLoans");

    const usersTab = document.getElementById("usersTab");
    const accountsTab = document.getElementById("accountsTab");
    const loansTab = document.getElementById("loansTab");

    if (tabUsers) tabUsers.classList.toggle("active", tab === "users");
    if (tabAccounts) tabAccounts.classList.toggle("active", tab === "accounts");
    if (tabLoans) tabLoans.classList.toggle("active", tab === "loans");

    if (usersTab) usersTab.classList.toggle("d-none", tab !== "users");
    if (accountsTab) accountsTab.classList.toggle("d-none", tab !== "accounts");
    if (loansTab) loansTab.classList.toggle("d-none", tab !== "loans");

    if (tab === "accounts" && accountsData.length === 0) {
        loadAccounts();
    } else if (tab === "loans" && loansData.length === 0) {
        loadLoans();
    }
}

async function apiFetch(url, options = {}) {
    const token = getAuthToken();
    const response = await fetch(url, {
        ...options,
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    if (response.status === 401) {
        clearAuth();
        window.location.href = "index.html";
        return null;
    }

    if (response.status === 403) {
        window.location.href = "dashboard.html";
        return null;
    }

    return response;
}

function showGlobalAlert(message, type) {
    const alertBox = document.getElementById("globalAlertBox");
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type === "success" ? "success" : "danger"} rounded-3 mb-4`;
    alertBox.classList.remove("d-none");
    setTimeout(() => alertBox.classList.add("d-none"), 4000);
}

async function loadMetricsSummary() {
    try {
        const [accRes, loanRes] = await Promise.allSettled([
            apiFetch(`${API_BASE_URL}/admin/accounts`),
            apiFetch(`${API_BASE_URL}/loanapplication/pending`)
        ]);
        if (accRes.status === "fulfilled" && accRes.value && accRes.value.ok) {
            const accs = await accRes.value.json();
            const el = document.getElementById("metricTotalAccounts");
            if (el) el.textContent = accs.length;
        }
        if (loanRes.status === "fulfilled" && loanRes.value && loanRes.value.ok) {
            const lns = await loanRes.value.json();
            const el = document.getElementById("metricPendingLoans");
            if (el) el.textContent = lns.length;
        }
    } catch (e) {
        console.warn("Metrics error:", e);
    }
}

// --- Users Tab ---

async function loadUsers() {
    const loading = document.getElementById("usersLoading");
    const errorBox = document.getElementById("usersError");
    const container = document.getElementById("usersTableContainer");

    if (loading) loading.classList.remove("d-none");
    if (errorBox) errorBox.classList.add("d-none");
    if (container) container.classList.add("d-none");

    try {
        const response = await apiFetch(`${API_BASE_URL}/admin/users`);
        if (!response) return;

        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) {}
            throw new Error(errorData.message || "İstifadəçiləri yükləmək mümkün olmadı.");
        }

        usersData = await response.json();
        if (loading) loading.classList.add("d-none");
        if (container) container.classList.remove("d-none");
        renderUsers(usersData);

    } catch (error) {
        if (loading) loading.classList.add("d-none");
        if (errorBox) {
            errorBox.textContent = error.message;
            errorBox.classList.remove("d-none");
        }
    }
}

function renderUsers(users) {
    const tbody = document.getElementById("usersTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const metricUsersEl = document.getElementById("metricTotalUsers");
    if (metricUsersEl) metricUsersEl.textContent = users.length;

    users.forEach(user => {
        const firstName = user.firstName || user.FirstName || "";
        const lastName = user.lastName || user.LastName || "";
        const email = user.email || user.Email || "-";
        const fullName = `${firstName} ${lastName}`.trim() || (email !== "-" ? email.split("@")[0] : "İstifadəçi");
        const initials = (firstName && lastName)
            ? `${firstName[0]}${lastName[0]}`.toUpperCase()
            : (fullName[0] || "U").toUpperCase();

        const rolesList = user.roles || user.Roles || [];
        const rolesHtml = rolesList.map(r => {
            const isAdmin = r.toLowerCase() === "admin";
            return `<span class="badge-role ${isAdmin ? 'admin' : ''} me-1"><i class="bi ${isAdmin ? 'bi-shield-fill-check' : 'bi-person'} me-1"></i>${escapeHtml(r)}</span>`;
        }).join("");

        const isActive = user.isActive !== undefined ? user.isActive : (user.IsActive !== undefined ? user.IsActive : true);
        const statusBadge = isActive
            ? '<span class="badge-active"><i class="bi bi-check-circle-fill me-1"></i> Aktiv</span>'
            : '<span class="badge-frozen"><i class="bi bi-x-circle-fill me-1"></i> Deaktiv</span>';

        const row = document.createElement("tr");
        row.dataset.search = `${fullName} ${email} ${user.phoneNumber || ""}`.toLowerCase();
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center gap-3">
                    <div class="user-avatar-mini">${initials}</div>
                    <div>
                        <div class="fw-bold" style="color: var(--dash-text-main); font-size: 0.95rem;">${escapeHtml(fullName)}</div>
                        <small class="text-muted font-monospace" style="font-size: 0.75rem;">ID: ${escapeHtml((user.id || user.Id || "").slice(0, 8))}...</small>
                    </div>
                </div>
            </td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <i class="bi bi-envelope text-muted"></i>
                    <span class="fw-semibold" style="color: #334155;">${escapeHtml(email)}</span>
                </div>
            </td>
            <td>
                <span class="font-monospace text-muted">${escapeHtml(user.phoneNumber || user.PhoneNumber || "-")}</span>
            </td>
            <td>${rolesHtml || '<span class="text-muted">-</span>'}</td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(row);
    });
}

function filterUsers() {
    const searchEl = document.getElementById("usersSearch");
    const query = searchEl ? searchEl.value.toLowerCase().trim() : "";
    document.querySelectorAll("#usersTableBody tr").forEach(row => {
        row.classList.toggle("d-none", !row.dataset.search.includes(query));
    });
}

// --- Accounts Tab ---

async function loadAccounts() {
    const loading = document.getElementById("accountsLoading");
    const errorBox = document.getElementById("accountsError");
    const container = document.getElementById("accountsTableContainer");

    if (loading) loading.classList.remove("d-none");
    if (errorBox) errorBox.classList.add("d-none");
    if (container) container.classList.add("d-none");

    try {
        const response = await apiFetch(`${API_BASE_URL}/admin/accounts`);
        if (!response) return;

        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) {}
            throw new Error(errorData.message || "Hesabları yükləmək mümkün olmadı.");
        }

        accountsData = await response.json();
        if (loading) loading.classList.add("d-none");
        if (container) container.classList.remove("d-none");
        renderAccounts(accountsData);

    } catch (error) {
        if (loading) loading.classList.add("d-none");
        if (errorBox) {
            errorBox.textContent = error.message;
            errorBox.classList.remove("d-none");
        }
    }
}

function renderAccounts(accounts) {
    const tbody = document.getElementById("accountsTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const metricAccsEl = document.getElementById("metricTotalAccounts");
    if (metricAccsEl) metricAccsEl.textContent = accounts.length;

    accounts.forEach(account => {
        const typeLabel = getAccountTypeLabel(account.accountType);
        const isActive = account.status === 0 || account.status === "Active";
        const statusBadge = isActive
            ? '<span class="badge-active"><i class="bi bi-shield-check me-1"></i> Aktiv</span>'
            : '<span class="badge-frozen"><i class="bi bi-snow me-1"></i> Dondurulub</span>';
        
        const actionBtnClass = isActive ? "btn-action-freeze" : "btn-action-unfreeze";
        const actionLabel = isActive ? `<i class="bi bi-snow me-1"></i> Dondur` : `<i class="bi bi-unlock me-1"></i> Aktivləşdir`;
        const newStatus = isActive ? 1 : 0;
        const confirmMsg = isActive
            ? "Bu hesabı dondurmaq istədiyinizə əminsiniz? Müştəri köçürmə edə bilməyəcək."
            : "Bu hesabı yenidən aktivləşdirmək istədiyinizə əminsiniz?";

        const row = document.createElement("tr");
        row.dataset.search = (account.accountNumber || "").toLowerCase();
        row.innerHTML = `
            <td>
                <div class="d-flex align-items-center gap-2">
                    <i class="bi bi-credit-card text-success fs-5"></i>
                    <span class="font-monospace fw-bold" style="color: var(--dash-text-main); font-size: 0.95rem;">${escapeHtml(account.accountNumber)}</span>
                </div>
            </td>
            <td>
                <span class="badge-role">${typeLabel}</span>
            </td>
            <td>
                <span class="fw-bold text-success font-monospace" style="font-size: 1rem;">₼ ${Number(account.balance || 0).toFixed(2)}</span>
            </td>
            <td>${statusBadge}</td>
            <td>
                <button class="${actionBtnClass} status-btn"
                    data-id="${account.id}" data-status="${newStatus}">
                    ${actionLabel}
                </button>
            </td>
        `;

        row.querySelector(".status-btn").addEventListener("click", function () {
            updateAccountStatus(account.id, newStatus, confirmMsg);
        });

        tbody.appendChild(row);
    });
}

async function updateAccountStatus(id, status, confirmMsg) {
    if (!confirm(confirmMsg)) return;

    try {
        const response = await apiFetch(`${API_BASE_URL}/admin/accounts/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });
        if (!response) return;

        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) {}
            throw new Error(errorData.message || "Hesab statusu dəyişdirilə bilmədi.");
        }

        showGlobalAlert("Hesab statusu uğurla yeniləndi", "success");
        accountsData = [];
        loadAccounts();

    } catch (error) {
        showGlobalAlert(error.message, "danger");
    }
}

function filterAccounts() {
    const searchEl = document.getElementById("accountsSearch");
    const query = searchEl ? searchEl.value.toLowerCase().trim() : "";
    document.querySelectorAll("#accountsTableBody tr").forEach(row => {
        row.classList.toggle("d-none", !row.dataset.search.includes(query));
    });
}

function getAccountTypeLabel(type) {
    const map = {
        0: "Cari Hesab",
        1: "Yığım Hesabı",
        "Savings": "Yığım Hesabı",
        "Current": "Cari Hesab"
    };
    return map[type] || "Bank Hesabı";
}

// --- Loans Tab ---

async function loadLoans() {
    const loading = document.getElementById("loansLoading");
    const errorBox = document.getElementById("loansError");
    const container = document.getElementById("loansTableContainer");
    const emptyState = document.getElementById("loansEmpty");

    if (loading) loading.classList.remove("d-none");
    if (errorBox) errorBox.classList.add("d-none");
    if (container) container.classList.add("d-none");
    if (emptyState) emptyState.classList.add("d-none");

    try {
        const response = await apiFetch(`${API_BASE_URL}/loanapplication/pending`);
        if (!response) return;

        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) {}
            throw new Error(errorData.message || "Kredit müraciətlərini yükləmək mümkün olmadı.");
        }

        loansData = await response.json();
        if (loading) loading.classList.add("d-none");

        if (!loansData || loansData.length === 0) {
            if (emptyState) emptyState.classList.remove("d-none");
            return;
        }

        if (container) container.classList.remove("d-none");
        renderLoans(loansData);

    } catch (error) {
        if (loading) loading.classList.add("d-none");
        if (errorBox) {
            errorBox.textContent = error.message;
            errorBox.classList.remove("d-none");
        }
    }
}

function renderLoans(loans) {
    const tbody = document.getElementById("loansTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    const metricLoansEl = document.getElementById("metricPendingLoans");
    if (metricLoansEl) metricLoansEl.textContent = loans.length;

    loans.forEach(loan => {
        const formattedDate = formatDate(loan.createdAt);

        const row = document.createElement("tr");
        row.dataset.search = `${loan.userId || ""} ${loan.reason || ""}`.toLowerCase();
        row.innerHTML = `
            <td>
                <span class="fw-bold text-success font-monospace" style="font-size: 1.05rem;">₼ ${Number(loan.amount ?? 0).toFixed(2)}</span>
            </td>
            <td>
                <span class="fw-semibold" style="color: var(--dash-text-main);">${loan.term} ay</span>
            </td>
            <td>
                <span class="text-secondary fw-medium">${escapeHtml(loan.reason || "-")}</span>
            </td>
            <td>
                <span class="text-muted small font-monospace">${formattedDate}</span>
            </td>
            <td>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn-action-approve approve-btn" data-id="${loan.id}">
                        <i class="bi bi-check-lg me-1"></i> Təsdiqlə
                    </button>
                    <button class="btn-action-decline decline-btn" data-id="${loan.id}">
                        <i class="bi bi-x-lg me-1"></i> İmtina
                    </button>
                </div>
            </td>
        `;

        row.querySelector(".approve-btn").addEventListener("click", function () {
            if (confirm("Bu kredit müraciətini təsdiqləmək istədiyinizə əminsiniz? Məbləğ avtomatik olaraq müştərinin hesabına köçürüləcək.")) {
                reviewLoan(loan.id, 1);
            }
        });

        row.querySelector(".decline-btn").addEventListener("click", function () {
            const reason = prompt("Zəhmət olmasa imtina səbəbini qeyd edin (məsələn: Aylıq gəlir kifayət deyil):");
            if (reason === null) return;
            reviewLoan(loan.id, 2, reason);
        });

        tbody.appendChild(row);
    });
}

async function reviewLoan(id, status, rejectionReason = null) {
    try {
        const payload = { status };
        if (rejectionReason && rejectionReason.trim().length > 0) {
            payload.rejectionReason = rejectionReason.trim();
        }

        const response = await apiFetch(`${API_BASE_URL}/loanapplication/${id}/review`, {
            method: "PATCH",
            body: JSON.stringify(payload)
        });
        if (!response) return;

        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) {}
            throw new Error(errorData.message || "Kredit müraciəti baxıla bilmədi.");
        }

        showGlobalAlert(status === 1 ? "Kredit təsdiqləndi və vəsait müştərinin hesabına köçürüldü!" : "Kredit müraciətinə imtina edildi.", "success");
        loansData = [];
        loadLoans();

    } catch (error) {
        showGlobalAlert(error.message, "danger");
    }
}

function formatDate(dateString) {
    if (!dateString) return "";
    const dateObj = new Date(dateString);
    const datePart = dateObj.toLocaleDateString("az-AZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
    const timePart = dateObj.toLocaleTimeString("az-AZ", {
        hour: "2-digit",
        minute: "2-digit"
    });
    return `${datePart} ${timePart}`;
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function filterLoans() {
    const searchEl = document.getElementById("loansSearch");
    const query = searchEl ? searchEl.value.toLowerCase().trim() : "";
    document.querySelectorAll("#loansTableBody tr").forEach(row => {
        row.classList.toggle("d-none", !row.dataset.search.includes(query));
    });
}
