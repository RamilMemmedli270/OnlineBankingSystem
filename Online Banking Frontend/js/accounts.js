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

        const accounts = await response.json();

        if (accounts.length === 0) {
            emptyState.classList.remove("d-none");
            return;
        }

        emptyState.classList.add("d-none");

        accounts.forEach(account => {
            const typeLabel = account.accountType === 0 ? "Əmanət" : "Cari";
            const statusLabel = account.status === 0 ? "Aktiv" : "Dondurulub";
            const statusClass = account.status === 0 ? "bg-success" : "bg-danger";
            const depositBtn = account.status === 0
                ? `<button class="btn btn-sm btn-outline-success mt-2 w-100" onclick="openDepositModal(${account.id}, '${account.accountNumber}')">💳 Pul Yüklə</button>`
                : '';

            const card = document.createElement("div");
            card.className = "col-md-6 col-lg-4";
            card.innerHTML = `
                <div class="card account-card shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge bg-primary">${typeLabel}</span>
                            <span class="badge ${statusClass}">${statusLabel}</span>
                        </div>
                        <p class="text-muted mb-1 small">Hesab Nömrəsi</p>
                        <p class="fw-bold mb-3">${account.accountNumber}</p>
                        <p class="text-muted mb-1 small">Balans</p>
                        <h4 class="fw-bold text-primary">${account.balance.toFixed(2)} AZN</h4>
                        ${depositBtn}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        errorBox.textContent = error.message;
        errorBox.classList.remove("d-none");
    }
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