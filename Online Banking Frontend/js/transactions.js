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