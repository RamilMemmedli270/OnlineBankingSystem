let allAccounts = [];

document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // --- Admin üçün sidebar məhdudiyyəti və direct URL girişindən qorunma ---
    const roles = JSON.parse(localStorage.getItem("roles") || "[]");

    // Admin bu səhifəyə birbaşa URL ilə daxil olmağa çalışarsa, dashboard-a yönləndir
    if (roles.includes("Admin") && !roles.includes("Customer")) {
        window.location.href = "dashboard.html";
        return;
    }

    if (roles.includes("Admin")) {
        const restrictedNavIds = ["navAccounts", "navTransfer", "navTransactions", "navLoans", "navNotifications", "navBalanceAlert"];
        restrictedNavIds.forEach(function (id) {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = "none";
            }
        });
    }
    // --- /Admin məhdudiyyəti ---

    loadAccounts();

    const typeFilterSelect = document.getElementById("accountTypeFilter");
    if (typeFilterSelect) {
        typeFilterSelect.addEventListener("change", function () {
            filterAndRenderAccounts();
        });
    }

    document.getElementById("createAccountForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        const accountType = parseInt(document.getElementById("accountType").value);
        const modalErrorBox = document.getElementById("modalErrorBox");
        modalErrorBox.classList.add("d-none");

        try {
            const response = await fetch(`${API_BASE_URL}/account`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ accountType })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Hesab yaradılarkən xəta baş verdi");
            }

            const modal = bootstrap.Modal.getInstance(document.getElementById("createAccountModal"));
            modal.hide();
            document.getElementById("createAccountForm").reset();

            loadAccounts();

        } catch (error) {
            modalErrorBox.textContent = error.message;
            modalErrorBox.classList.remove("d-none");
        }
    });

    // Quick Amount Buttons click handler
    document.addEventListener("click", function (e) {
        if (e.target && e.target.classList.contains("quick-amount-btn")) {
            const val = e.target.getAttribute("data-value");
            const amountInput = document.getElementById("depositAmount");
            if (amountInput) {
                amountInput.value = val;
            }
        }
    });
});

async function loadAccounts() {
    const token = localStorage.getItem("token");
    const container = document.getElementById("accountsContainer");
    const emptyState = document.getElementById("emptyState");
    const errorBox = document.getElementById("errorBox");

    errorBox.classList.add("d-none");
    container.innerHTML = "";

    try {
        const response = await fetch(`${API_BASE_URL}/account`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Hesablar yüklənərkən xəta baş verdi");
        }

        allAccounts = await response.json();
        filterAndRenderAccounts();

    } catch (error) {
        errorBox.textContent = error.message;
        errorBox.classList.remove("d-none");
    }
}

function filterAndRenderAccounts() {
    const filterSelect = document.getElementById("accountTypeFilter");
    const filterValue = filterSelect ? filterSelect.value : "all";
    
    let filtered = allAccounts;
    if (filterValue !== "all") {
        const typeNum = parseInt(filterValue);
        filtered = allAccounts.filter(a => a.accountType === typeNum);
    }
    
    renderAccounts(filtered);
}

function renderAccounts(accounts) {
    const container = document.getElementById("accountsContainer");
    const emptyState = document.getElementById("emptyState");
    
    container.innerHTML = "";

    if (!accounts || accounts.length === 0) {
        emptyState.classList.remove("d-none");
        return;
    }

    emptyState.classList.add("d-none");

    accounts.forEach(account => {
        const typeLabel = account.accountType === 0 ? "Əmanət" : "Cari";
        const statusLabel = account.status === 0 ? "Aktiv" : "Bloklanmış";
        const statusClass = account.status === 0 ? "bg-success" : "bg-danger";

        // Modern Neobank Card Gradients
        const cardGradient = account.accountType === 0 
            ? "linear-gradient(135deg, #1e293b 0%, #4361ee 100%)" // Savings: Slate to Blue
            : "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)"; // Current: Indigo to Cyan

        // Format masked card number (e.g. **** 2624)
        const maskedAccNumber = maskAccountNumber(account.accountNumber);

        const card = document.createElement("div");
        card.className = "col-md-6 col-lg-4 mb-4";
        card.innerHTML = `
            <div class="card account-card shadow-lg text-white border-0 position-relative overflow-hidden" style="background: ${cardGradient}; border-radius: 16px; min-height: 230px; transition: transform 0.2s, box-shadow 0.2s;">
                <!-- Texture overlay -->
                <div class="position-absolute w-100 h-100" style="background: linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0)); top: 0; left: 0; pointer-events: none; z-index: 1;"></div>
                
                <div class="card-body d-flex flex-column justify-content-between p-4 position-relative" style="z-index: 2; height: 100%;">
                    <!-- Top Row: Logo & Badges -->
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="fw-bold tracking-wider" style="font-size: 1.1rem; opacity: 0.95; letter-spacing: 1px;">🏦 Online Banking</span>
                        <div class="d-flex gap-2">
                            <span class="badge" style="background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(5px); font-weight: 500; font-size: 0.75rem;">${typeLabel}</span>
                            <span class="badge ${statusClass}" style="font-size: 0.75rem;">${statusLabel}</span>
                        </div>
                    </div>
                    
                    <!-- Middle Row: Chip & Masked Account Number -->
                    <div class="mb-2">
                        <!-- Golden Sim Card Chip -->
                        <div class="mb-2" style="width: 40px; height: 28px; background: linear-gradient(135deg, #facc15 0%, #eab308 100%); border-radius: 6px; box-shadow: inset 0 1px 2px rgba(255,255,255,0.4);"></div>
                        
                        <p class="mb-0 text-uppercase tracking-wider text-white-50" style="font-size: 0.65rem; letter-spacing: 1px;">Hesab Nömrəsi</p>
                        <p class="fs-5 fw-bold mb-0 font-monospace tracking-widest text-white" style="letter-spacing: 1px;">${maskedAccNumber}</p>
                    </div>
                    
                    <!-- Bottom Row: Balance & Action Buttons -->
                    <div class="mt-2">
                        <div class="d-flex justify-content-between align-items-end mb-3">
                            <div>
                                <p class="mb-0 text-uppercase tracking-wider text-white-50" style="font-size: 0.65rem; letter-spacing: 1px;">Balans</p>
                                <h3 class="fw-bold mb-0 text-white" style="font-size: 1.45rem;">${account.balance.toFixed(2)} AZN</h3>
                            </div>
                            <!-- Modern logo circles -->
                            <div class="d-flex" style="opacity: 0.75;">
                                <div style="width: 24px; height: 24px; background: rgba(255,255,255,0.3); border-radius: 50%; margin-right: -8px; backdrop-filter: blur(2px);"></div>
                                <div style="width: 24px; height: 24px; background: rgba(255,255,255,0.15); border-radius: 50%; backdrop-filter: blur(2px);"></div>
                            </div>
                        </div>

                        <!-- Action Buttons inside Card -->
                        <div class="d-flex gap-2" style="position: relative; z-index: 10;">
                            <a href="transfer.html?from=${account.id}" class="btn btn-sm btn-outline-light flex-grow-1" style="border-radius: 10px; font-size: 0.8rem; font-weight: 600;"><i class="bi bi-arrow-left-right"></i> Köçür</a>
                            ${account.status === 0 ? `<button class="btn btn-sm btn-light flex-grow-1" onclick="openDepositModal(${account.id}, '${account.accountNumber}')" style="border-radius: 10px; font-size: 0.8rem; font-weight: 600; color: var(--text-dark);"><i class="bi bi-wallet2"></i> Pul Yüklə</button>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

let depositModalInstance = null;

function openDepositModal(accountId, accountNumber) {
    document.getElementById("depositAccountId").value = accountId;
    document.getElementById("depositAccountNumber").value = accountNumber;
    document.getElementById("depositAmount").value = "";
    document.getElementById("depositDescription").value = "";
    document.getElementById("depositModalErrorBox").classList.add("d-none");

    if (!depositModalInstance) {
        depositModalInstance = new bootstrap.Modal(document.getElementById("depositModal"));
    }
    depositModalInstance.show();
}

document.addEventListener("DOMContentLoaded", function () {
    const depositForm = document.getElementById("depositForm");
    if (depositForm) {
        depositForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const token = localStorage.getItem("token");

            const accountId = parseInt(document.getElementById("depositAccountId").value);
            const amount = parseFloat(document.getElementById("depositAmount").value);
            const description = document.getElementById("depositDescription").value;
            const depositModalErrorBox = document.getElementById("depositModalErrorBox");
            depositModalErrorBox.classList.add("d-none");

            try {
                const response = await fetch(`${API_BASE_URL}/transaction/deposit`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ accountId, amount, description })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Pul yüklənərkən xəta baş verdi");
                }

                const modal = bootstrap.Modal.getInstance(document.getElementById("depositModal"));
                modal.hide();
                depositForm.reset();

                loadAccounts();

            } catch (error) {
                depositModalErrorBox.textContent = error.message;
                depositModalErrorBox.classList.remove("d-none");
            }
        });
    }
});