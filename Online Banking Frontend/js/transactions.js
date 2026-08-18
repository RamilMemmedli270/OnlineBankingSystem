document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");

    // Redirect to index.html if token doesn't exist
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // Admin role check
    const roles = JSON.parse(localStorage.getItem("roles") || "[]");
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
    searchInput.addEventListener("input", filterTable);

    const typeFilter = document.getElementById("typeFilter");
    typeFilter.addEventListener("change", filterTable);
});

/**
 * Loads user accounts from the API and populates the dropdown
 */
async function loadAccounts() {
    const token = localStorage.getItem("token");
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
            localStorage.clear();
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
            const optionText = `${account.accountNumber} - ${typeLabel} - ${account.balance.toFixed(2)} AZN`;

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
    const token = localStorage.getItem("token");
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
            localStorage.clear();
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
        transactionsLoading.classList.add("d-none");

        if (transactions.length === 0) {
            emptyState.classList.remove("d-none");
            return;
        }

        // Render transactions rows
        transactions.forEach(t => {
            // Mapping TransactionType: 0 = Transfer (Köçürmə), 1 = Deposit (Mədaxil), 2 = Withdrawal (Məxaric)
            let typeLabel = "Əməliyyat";
            let direction = "incoming"; // default to incoming
            let counterparty = "-";

            if (t.transactionType === 0) {
                typeLabel = "Köçürmə";
                // For Transfer: verify if selected account is sender or recipient
                if (t.fromAccountId === parseInt(accountId)) {
                    direction = "outgoing";
                    counterparty = t.toAccountId ? `Hesab ID: ${t.toAccountId}` : "-";
                } else {
                    direction = "incoming";
                    counterparty = t.fromAccountId ? `Hesab ID: ${t.fromAccountId}` : "-";
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

            // Format timestamp (ISO format to az-AZ locale format: dd.MM.yyyy HH:mm)
            const dateObj = new Date(t.createdAt);
            const formattedDate = dateObj.toLocaleString('az-AZ', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const row = document.createElement("tr");
            row.dataset.direction = direction; // Store direction for filtering

            row.innerHTML = `
                <td>${formattedDate}</td>
                <td><span class="badge bg-secondary">${typeLabel}</span></td>
                <td>${counterparty}</td>
                <td class="fw-bold ${amountClass}">${amountSign}${t.amount.toFixed(2)} AZN</td>
                <td>${t.balanceSnapshot.toFixed(2)} AZN</td>
            `;

            tableBody.appendChild(row);
        });

        tableContainer.classList.remove("d-none");

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
 * Filters the transaction table locally by search query and transaction type
 */
function filterTable() {
    const searchQuery = document.getElementById("searchInput").value.toLowerCase();
    const typeFilterVal = document.getElementById("typeFilter").value;
    const rows = document.querySelectorAll("#transactionTableBody tr");

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const direction = row.dataset.direction;

        const matchesSearch = text.includes(searchQuery);
        const matchesType = (typeFilterVal === "all") || (direction === typeFilterVal);

        if (matchesSearch && matchesType) {
            row.classList.remove("d-none");
        } else {
            row.classList.add("d-none");
        }
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
