let allTransactions = [];

document.addEventListener("DOMContentLoaded", function () {
    const token = sessionStorage.getItem("token");

    // Redirect to index.html if token doesn't exist
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // Admin role check
    const roles = JSON.parse(sessionStorage.getItem("roles") || "[]");
    const isAdmin = roles.includes("Admin");
    const isCustomer = roles.includes("Customer");

    // Hide customer-only sidebar links for Admin
    if (isAdmin) {
        const customerNavItems = [
            "navAccounts",
            "navTransfer",
            "navTransactions",
            "navLoans",
            "navNotifications",
            "navBalanceAlert"
        ];

        customerNavItems.forEach(id => {
            const navItem = document.getElementById(id);
            if (navItem) {
                navItem.style.display = "none";
            }
        });

        // Admins should not access customer pages
        if (!isCustomer) {
            window.location.href = "dashboard.html";
            return;
        }
    }

    // Load accounts initially
    loadAccounts();

    // Bind event listeners
    const accountSelect = document.getElementById("accountSelect");
    accountSelect.addEventListener("change", handleAccountChange);

    const filterBtn = document.getElementById("filterBtn");
    filterBtn.addEventListener("click", handleDateFilter);

    const clearFilterBtn = document.getElementById("clearFilterBtn");
    clearFilterBtn.addEventListener("click", handleClearFilter);

    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", filterAndRenderTransactions);

    const typeFilter = document.getElementById("typeFilter");
    typeFilter.addEventListener("change", filterAndRenderTransactions);
});

/**
 * Loads user accounts from the API and populates the dropdown
 */
async function loadAccounts() {
    const token = sessionStorage.getItem("token");
    const selectElement = document.getElementById("accountSelect");
    const accountsLoading = document.getElementById("accountsLoading");
    const noAccountState = document.getElementById("noAccountState");
    const mainContent = document.getElementById("mainContent");
    const alertBox = document.getElementById("alertBox");

    // Reset UI state
    alertBox.classList.add("d-none");
    noAccountState.classList.add("d-none");
    mainContent.classList.add("d-none");
    accountsLoading.classList.remove("d-none");

    try {
        const response = await fetch(`${API_BASE_URL}/account`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        // 401 Unauthorized handling
        if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = "index.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Hesablar yüklənərkən xəta baş verdi");
        }

        const accounts = await response.json();
        accountsLoading.classList.add("d-none");

        if (accounts.length === 0) {
            noAccountState.classList.remove("d-none");
            return;
        }

        // Show main content
        mainContent.classList.remove("d-none");

        // Populate dropdown options
        accounts.forEach(account => {
            const typeLabel = account.accountType === 0 ? "Əmanət" : "Cari";
            const maskedNum = maskAccountNumber(account.accountNumber);
            const optionText = `${maskedNum} - ${typeLabel} - ${(account.balance ?? 0).toFixed(2)} AZN`;

            const option = document.createElement("option");
            option.value = account.id;
            option.textContent = optionText;
            selectElement.appendChild(option);
        });

    } catch (error) {
        accountsLoading.classList.add("d-none");
        showAlert(error.message, "danger");
    }
}

/**
 * Handles account dropdown change
 */
function handleAccountChange() {
    const accountSelect = document.getElementById("accountSelect");
    const accountId = accountSelect.value;

    // Reset search, type and date inputs
    document.getElementById("searchInput").value = "";
    document.getElementById("typeFilter").value = "all";
    document.getElementById("fromDate").value = "";
    document.getElementById("toDate").value = "";

    const filterSearchSection = document.getElementById("filterSearchSection");
    const tableContainer = document.getElementById("tableContainer");
    const emptyState = document.getElementById("emptyState");

    if (!accountId) {
        filterSearchSection.classList.add("d-none");
        tableContainer.classList.add("d-none");
        emptyState.classList.add("d-none");
        return;
    }

    // Show filter & search section
    filterSearchSection.classList.remove("d-none");

    // Load transactions for the selected account
    loadTransactions(accountId);
}

/**
 * Loads transactions for a selected account ID (optionally date filtered)
 */
async function loadTransactions(accountId, fromDate = null, toDate = null) {
    const token = sessionStorage.getItem("token");
    const transactionsLoading = document.getElementById("transactionsLoading");
    const tableContainer = document.getElementById("tableContainer");
    const emptyState = document.getElementById("emptyState");
    const tableBody = document.getElementById("transactionTableBody");
    const alertBox = document.getElementById("alertBox");

    // Reset UI state
    alertBox.classList.add("d-none");
    tableBody.innerHTML = "";
    tableContainer.classList.add("d-none");
    emptyState.classList.add("d-none");
    transactionsLoading.classList.remove("d-none");

    // Build URL based on filters
    let url = `${API_BASE_URL}/transaction/account/${accountId}`;
    if (fromDate && toDate) {
        url = `${API_BASE_URL}/transaction/account/${accountId}/statement?from=${fromDate}&to=${toDate}`;
    }

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        // 401 Unauthorized handling
        if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = "index.html";
            return;
        }

        if (!response.ok) {
            let errorData = {};
            try {
                errorData = await response.json();
            } catch (e) {}
            throw new Error(errorData.message || "Əməliyyatları yükləmək mümkün olmadı.");
        }

        const transactions = await response.json();
        allTransactions = transactions;
        transactionsLoading.classList.add("d-none");

        if (allTransactions.length === 0) {
            emptyState.classList.remove("d-none");
            return;
        }

        filterAndRenderTransactions();

    } catch (error) {
        transactionsLoading.classList.add("d-none");
        showAlert(error.message, "danger");
    }
}

/**
 * Handles Date Filter click
 */
function handleDateFilter() {
    const accountSelect = document.getElementById("accountSelect");
    const accountId = accountSelect.value;
    const fromDate = document.getElementById("fromDate").value;
    const toDate = document.getElementById("toDate").value;

    if (!accountId) {
        showAlert("Zəhmət olmasa əvvəlcə hesab seçin.", "warning");
        return;
    }

    if (!fromDate || !toDate) {
        showAlert("Zəhmət olmasa həm başlanğıc, həm də son tarixi seçin.", "warning");
        return;
    }

    // Load filtered transactions
    loadTransactions(accountId, fromDate, toDate);
}

/**
 * Handles Clearing Filter
 */
function handleClearFilter() {
    const accountSelect = document.getElementById("accountSelect");
    const accountId = accountSelect.value;

    // Reset filter inputs
    document.getElementById("fromDate").value = "";
    document.getElementById("toDate").value = "";
    document.getElementById("searchInput").value = "";
    document.getElementById("typeFilter").value = "all";

    if (accountId) {
        loadTransactions(accountId);
    }
}

/**
 * Filters the transaction list locally by search query and transaction type
 */
function filterAndRenderTransactions() {
    const searchInput = document.getElementById("searchInput");
    const searchQuery = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const typeFilterVal = document.getElementById("typeFilter").value;
    const accountSelect = document.getElementById("accountSelect");
    const accountId = accountSelect ? accountSelect.value : null;

    let filtered = allTransactions;

    // 1. Filter by direction (incoming/outgoing)
    if (typeFilterVal !== "all") {
        filtered = filtered.filter(t => {
            let direction = "incoming";
            if (t.transactionType === 0) {
                if (Number(t.fromAccountId) === Number(accountId)) {
                    direction = "outgoing";
                }
            } else if (t.transactionType === 2) {
                direction = "outgoing";
            }
            return direction === typeFilterVal;
        });
    }

    // 2. Filter by search query (description, fromAccountNumber, toAccountNumber, typeLabel)
    if (searchQuery) {
        filtered = filtered.filter(t => {
            let typeLabel = "əməliyyat";
            if (t.transactionType === 0) typeLabel = "köçürmə";
            else if (t.transactionType === 1) typeLabel = "mədaxil";
            else if (t.transactionType === 2) typeLabel = "məxaric";

            const desc = (t.description || "").toLowerCase();
            const fromAcc = (t.fromAccountNumber || "").toLowerCase();
            const toAcc = (t.toAccountNumber || "").toLowerCase();

            return desc.includes(searchQuery) ||
                   fromAcc.includes(searchQuery) ||
                   toAcc.includes(searchQuery) ||
                   typeLabel.includes(searchQuery);
        });
    }

    renderTransactionsList(filtered, accountId);
}

function renderTransactionsList(transactions, accountId) {
    const tableBody = document.getElementById("transactionTableBody");
    const emptyState = document.getElementById("emptyState");
    const tableContainer = document.getElementById("tableContainer");

    tableBody.innerHTML = "";

    if (transactions.length === 0) {
        tableContainer.classList.add("d-none");
        emptyState.classList.remove("d-none");
        return;
    }

    emptyState.classList.add("d-none");
    tableContainer.classList.remove("d-none");

    transactions.forEach(t => {
        let typeLabel = "Əməliyyat";
        let direction = "incoming";
        let counterparty = "-";

        if (t.transactionType === 0) {
            typeLabel = "Köçürmə";
            if (Number(t.fromAccountId) === Number(accountId)) {
                direction = "outgoing";
                counterparty = t.toAccountNumber ? maskAccountNumber(t.toAccountNumber) : "-";
            } else {
                direction = "incoming";
                counterparty = t.fromAccountNumber ? maskAccountNumber(t.fromAccountNumber) : "-";
            }
        } else if (t.transactionType === 1) {
            typeLabel = "Mədaxil";
            direction = "incoming";
            counterparty = "Nağd";
        } else if (t.transactionType === 2) {
            typeLabel = "Məxaric";
            direction = "outgoing";
            counterparty = "Nağd";
        }

        const amountSign = direction === "incoming" ? "+" : "-";
        const amountClass = direction === "incoming" ? "text-success" : "text-danger";

        const dateObj = new Date(t.createdAt);
        const dateStr = dateObj.toLocaleDateString('az-AZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const timeStr = dateObj.toLocaleTimeString('az-AZ', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const row = document.createElement("tr");
        row.dataset.direction = direction;

        let badgeStyle = "background: rgba(108, 117, 125, 0.08); color: #6c757d; border: 1px solid rgba(108, 117, 125, 0.15); font-weight: 600; font-size: 0.75rem; border-radius: 8px;";
        let icon = "⚙️";
        if (t.transactionType === 0) {
            badgeStyle = "background: rgba(79, 70, 229, 0.08); color: var(--primary-color); border: 1px solid rgba(79, 70, 229, 0.15); font-weight: 600; font-size: 0.75rem; border-radius: 8px;";
            icon = "💸";
        } else if (t.transactionType === 1) {
            badgeStyle = "background: rgba(16, 185, 129, 0.08); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.15); font-weight: 600; font-size: 0.75rem; border-radius: 8px;";
            icon = "💰";
        } else if (t.transactionType === 2) {
            badgeStyle = "background: rgba(239, 68, 68, 0.08); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.15); font-weight: 600; font-size: 0.75rem; border-radius: 8px;";
            icon = "💳";
        }

        const balanceToShow = getDisplayBalance(t, accountId);

        row.innerHTML = `
            <td style="padding-left: 15px;">
                <div class="fw-semibold text-dark" style="font-size: 0.85rem;">${dateStr}</div>
                <div class="text-muted" style="font-size: 0.72rem;">${timeStr}</div>
            </td>
            <td><span class="badge py-2 px-3" style="${badgeStyle}">${icon} ${typeLabel}</span></td>
            <td style="font-family: monospace; font-size: 0.85rem; color: #475569; font-weight: 500;">${counterparty}</td>
            <td class="fw-bold ${amountClass}" style="font-size: 0.95rem;">${amountSign}${(t.amount ?? 0).toFixed(2)} AZN</td>
            <td style="padding-right: 15px;">
                <span class="badge bg-light text-secondary py-2 px-3 fw-semibold" style="border: 1px solid #e2e8f0; font-size: 0.82rem; border-radius: 8px;">${(balanceToShow ?? 0).toFixed(2)} AZN</span>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

/**
 * Utility helper to display alert messages
 */
function showAlert(message, type = "danger") {
    const alertBox = document.getElementById("alertBox");
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove("d-none");
}

function getDisplayBalance(transaction, accountId) {
    if (Number(transaction.toAccountId) === Number(accountId)) {
        return transaction.toBalanceSnapshot ?? 0;
    }
    if (Number(transaction.fromAccountId) === Number(accountId)) {
        return transaction.fromBalanceSnapshot ?? 0;
    }
    return 0;
}
