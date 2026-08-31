let usersData = [];
let accountsData = [];
let loansData = [];

document.addEventListener("DOMContentLoaded", function () {
    const token = sessionStorage.getItem("token");

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    const roles = JSON.parse(sessionStorage.getItem("roles") || "[]");
    if (!roles.includes("Admin")) {
        window.location.href = "dashboard.html";
        return;
    }

   
    const restrictedNavIds = ["navAccounts", "navTransfer", "navTransactions", "navLoans", "navNotifications", "navBalanceAlert", "navSavingsGoal"];
    restrictedNavIds.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = "none";
        }
    });

    document.getElementById("tabUsers").addEventListener("click", () => switchTab("users"));
    document.getElementById("tabAccounts").addEventListener("click", () => switchTab("accounts"));
    document.getElementById("tabLoans").addEventListener("click", () => switchTab("loans"));

    document.getElementById("usersSearch").addEventListener("input", filterUsers);
    document.getElementById("accountsSearch").addEventListener("input", filterAccounts);
    
    const loansSearch = document.getElementById("loansSearch");
    if (loansSearch) {
        loansSearch.addEventListener("input", filterLoans);
    }

    loadUsers();

    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get("tab");
    if (tabParam && ["users", "accounts", "loans"].includes(tabParam)) {
        switchTab(tabParam);
    }
});

function switchTab(tab) {
    document.getElementById("tabUsers").classList.toggle("active", tab === "users");
    document.getElementById("tabAccounts").classList.toggle("active", tab === "accounts");
    document.getElementById("tabLoans").classList.toggle("active", tab === "loans");

    document.getElementById("usersTab").classList.toggle("d-none", tab !== "users");
    document.getElementById("accountsTab").classList.toggle("d-none", tab !== "accounts");
    document.getElementById("loansTab").classList.toggle("d-none", tab !== "loans");

    if (tab === "accounts" && accountsData.length === 0) {
        loadAccounts();
    } else if (tab === "loans" && loansData.length === 0) {
        loadLoans();
    }
}

async function apiFetch(url, options = {}) {
    const token = sessionStorage.getItem("token");
    const response = await fetch(url, {
        ...options,
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    if (response.status === 401) {
        sessionStorage.clear();
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
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove("d-none");
    setTimeout(() => alertBox.classList.add("d-none"), 4000);
}

// --- Users Tab ---

async function loadUsers() {
    const loading = document.getElementById("usersLoading");
    const errorBox = document.getElementById("usersError");
    const container = document.getElementById("usersTableContainer");

    loading.classList.remove("d-none");
    errorBox.classList.add("d-none");
    container.classList.add("d-none");

    try {
        const response = await apiFetch(`${API_BASE_URL}/admin/users`);
        if (!response) return;

        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) {}
            throw new Error(errorData.message || "İstifadəçiləri yükləmək mümkün olmadı.");
        }

        usersData = await response.json();
        loading.classList.add("d-none");
        container.classList.remove("d-none");
        renderUsers(usersData);

    } catch (error) {
        loading.classList.add("d-none");
        errorBox.textContent = error.message;
        errorBox.classList.remove("d-none");
    }
}

function renderUsers(users) {
    const tbody = document.getElementById("usersTableBody");
    tbody.innerHTML = "";

    users.forEach(user => {
        const fullName = `${user.firstName} ${user.lastName}`;
        const rolesHtml = (user.roles || []).map(r =>
            `<span class="badge bg-primary me-1">${escapeHtml(r)}</span>`
        ).join("");
        const statusBadge = user.isActive
            ? '<span class="badge bg-success">Aktiv</span>'
            : '<span class="badge bg-secondary">Deaktiv</span>';

        const row = document.createElement("tr");
        row.dataset.search = `${fullName} ${user.email}`.toLowerCase();
        row.innerHTML = `
            <td>${escapeHtml(fullName)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${escapeHtml(user.phoneNumber || "-")}</td>
            <td>${rolesHtml || "-"}</td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(row);
    });
}

function filterUsers() {
    const query = document.getElementById("usersSearch").value.toLowerCase();
    document.querySelectorAll("#usersTableBody tr").forEach(row => {
        row.classList.toggle("d-none", !row.dataset.search.includes(query));
    });
}

// --- Accounts Tab ---

async function loadAccounts() {
    const loading = document.getElementById("accountsLoading");
    const errorBox = document.getElementById("accountsError");
    const container = document.getElementById("accountsTableContainer");

    loading.classList.remove("d-none");
    errorBox.classList.add("d-none");
    container.classList.add("d-none");

    try {
        const response = await apiFetch(`${API_BASE_URL}/admin/accounts`);
        if (!response) return;

        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) {}
            throw new Error(errorData.message || "Hesabları yükləmək mümkün olmadı.");
        }

        accountsData = await response.json();
        loading.classList.add("d-none");
        container.classList.remove("d-none");
        renderAccounts(accountsData);

    } catch (error) {
        loading.classList.add("d-none");
        errorBox.textContent = error.message;
        errorBox.classList.remove("d-none");
    }
}

function renderAccounts(accounts) {
    const tbody = document.getElementById("accountsTableBody");
    tbody.innerHTML = "";

    accounts.forEach(account => {
        const typeLabel = getAccountTypeLabel(account.accountType);
        const isActive = account.status === 0 || account.status === "Active";
        const statusLabel = isActive ? "Active" : "Frozen";
        const statusClass = isActive ? "bg-success" : "bg-danger";
        const actionLabel = isActive ? "Dondur" : "Aktivləşdir";
        const newStatus = isActive ? 1 : 0;
        const confirmMsg = isActive
            ? "Bu hesabı dondurmaq istədiyinizə əminsiniz?"
            : "Bu hesabı aktivləşdirmək istədiyinizə əminsiniz?";

        const row = document.createElement("tr");
        row.dataset.search = account.accountNumber.toLowerCase();
        row.innerHTML = `
            <td>${escapeHtml(account.accountNumber)}</td>
            <td>${typeLabel}</td>
            <td>${account.balance.toFixed(2)} AZN</td>
            <td><span class="badge ${statusClass}">${statusLabel}</span></td>
            <td>
                <button class="btn btn-sm ${isActive ? "btn-outline-danger" : "btn-outline-success"} status-btn"
                    data-id="${account.id}" data-status="${newStatus}" data-confirm="${escapeHtml(confirmMsg)}">
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
    const query = document.getElementById("accountsSearch").value.toLowerCase();
    document.querySelectorAll("#accountsTableBody tr").forEach(row => {
        row.classList.toggle("d-none", !row.dataset.search.includes(query));
    });
}

function getAccountTypeLabel(type) {
    const map = {
        0: "Savings",
        1: "Current",
        "Savings": "Savings",
        "Current": "Current"
    };
    return map[type] || String(type);
}

// --- Loans Tab ---

async function loadLoans() {
    const loading = document.getElementById("loansLoading");
    const errorBox = document.getElementById("loansError");
    const container = document.getElementById("loansTableContainer");
    const emptyState = document.getElementById("loansEmpty");

    loading.classList.remove("d-none");
    errorBox.classList.add("d-none");
    container.classList.add("d-none");
    emptyState.classList.add("d-none");

    try {
        const response = await apiFetch(`${API_BASE_URL}/loanapplication/pending`);
        if (!response) return;

        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) {}
            throw new Error(errorData.message || "Kredit müraciətlərini yükləmək mümkün olmadı.");
        }

        loansData = await response.json();
        loading.classList.add("d-none");

        if (loansData.length === 0) {
            emptyState.classList.remove("d-none");
            return;
        }

        container.classList.remove("d-none");
        renderLoans(loansData);

    } catch (error) {
        loading.classList.add("d-none");
        errorBox.textContent = error.message;
        errorBox.classList.remove("d-none");
    }
}

function renderLoans(loans) {
    const tbody = document.getElementById("loansTableBody");
    tbody.innerHTML = "";

    loans.forEach(loan => {
        const formattedDate = formatDate(loan.createdAt);

        const row = document.createElement("tr");
        row.dataset.search = `${loan.userId || ""} ${loan.reason || ""}`.toLowerCase();
        row.innerHTML = `
            <td>${(loan.amount ?? 0).toFixed(2)} AZN</td>
            <td>${loan.term} ay</td>
            <td>${escapeHtml(loan.reason)}</td>
            <td>${formattedDate}</td>
            <td>
                <button class="btn btn-sm btn-success me-1 approve-btn" data-id="${loan.id}">Təsdiqlə</button>
                <button class="btn btn-sm btn-danger decline-btn" data-id="${loan.id}">Rədd et</button>
            </td>
        `;

        row.querySelector(".approve-btn").addEventListener("click", function () {
            reviewLoan(loan.id, 1, "Bu kredit müraciətini təsdiqləmək istədiyinizə əminsiniz?");
        });

        row.querySelector(".decline-btn").addEventListener("click", function () {
            reviewLoan(loan.id, 2, "Bu kredit müraciətini rədd etmək istədiyinizə əminsiniz?");
        });

        tbody.appendChild(row);
    });
}

async function reviewLoan(id, status, confirmMsg) {
    if (!confirm(confirmMsg)) return;

    try {
        const response = await apiFetch(`${API_BASE_URL}/loanapplication/${id}/review`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });
        if (!response) return;

        if (!response.ok) {
            let errorData = {};
            try { errorData = await response.json(); } catch (e) {}
            throw new Error(errorData.message || "Kredit müraciəti baxıla bilmədi.");
        }

        showGlobalAlert("Kredit müraciəti uğurla yeniləndi", "success");
        loansData = [];
        loadLoans();

    } catch (error) {
        showGlobalAlert(error.message, "danger");
    }
}

function formatDate(dateString) {
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
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function filterLoans() {
    const query = document.getElementById("loansSearch").value.toLowerCase();
    document.querySelectorAll("#loansTableBody tr").forEach(row => {
        row.classList.toggle("d-none", !row.dataset.search.includes(query));
    });
}
