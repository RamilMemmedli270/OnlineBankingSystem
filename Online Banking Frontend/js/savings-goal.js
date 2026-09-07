let allGoals = [];
let userAccounts = [];

document.addEventListener("DOMContentLoaded", async function () {
    const token = sessionStorage.getItem("token");

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    const roles = JSON.parse(sessionStorage.getItem("roles") || "[]");
    
    // Admin bu səhifəyə birbaşa URL ilə daxil olmağa çalışarsa, dashboard-a yönləndir
    if (roles.includes("Admin") && !roles.includes("Customer")) {
        window.location.href = "dashboard.html";
        return;
    }

    if (roles.includes("Admin")) {
        const restrictedNavIds = ["navAccounts", "navTransfer", "navTransactions", "navLoans", "navNotifications", "navBalanceAlert", "navSavingsGoal"];
        restrictedNavIds.forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });
    }

    // İstifadəçinin kartlarını və hədəf qutularını yükləyirik
    await loadUserAccounts(token);
    await loadSavingsGoals(token);

    // Axtarış filtri
    const searchInput = document.getElementById("searchGoalInput");
    if (searchInput) {
        searchInput.addEventListener("input", filterAndRenderGoals);
    }

    // 1. Yeni Qutu Yaratma Formu
    const createGoalForm = document.getElementById("createGoalForm");
    if (createGoalForm) {
        createGoalForm.addEventListener("submit", handleCreateGoal);
    }

    // 2. Qutuya Pul Atma Formu
    const topUpForm = document.getElementById("topUpForm");
    if (topUpForm) {
        topUpForm.addEventListener("submit", handleTopUp);
    }

    // 3. Qutudan Pul Çıxarma Formu
    const withdrawForm = document.getElementById("withdrawForm");
    if (withdrawForm) {
        withdrawForm.addEventListener("submit", handleWithdraw);
    }
});

// İstifadəçinin aktiv kartlarını çəkirik
async function loadUserAccounts(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/account`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Hesablar yüklənə bilmədi");

        userAccounts = await response.json();
    } catch (error) {
        console.error("Hesabların yüklənməsi xətası:", error);
    }
}

// Bütün yığım qutularını yükləyirik
async function loadSavingsGoals(token) {
    const loadingState = document.getElementById("loadingState");
    const emptyState = document.getElementById("emptyState");
    const container = document.getElementById("goalsContainer");

    if (loadingState) loadingState.classList.remove("d-none");
    if (emptyState) emptyState.classList.add("d-none");
    if (container) container.classList.add("d-none");

    try {
        const res = await fetch(`${API_BASE_URL}/SavingsGoal`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.status === 401) {
            sessionStorage.clear();
            window.location.href = "index.html";
            return;
        }

        if (!res.ok) throw new Error("Qutular yüklənərkən xəta baş verdi");

        allGoals = await res.json();
        
        if (loadingState) loadingState.classList.add("d-none");
        filterAndRenderGoals();

    } catch (error) {
        if (loadingState) loadingState.classList.add("d-none");
        showGlobalAlert(error.message, "danger");
    }
}

// Qutuları ekranda göstərmək
function filterAndRenderGoals() {
    const searchInput = document.getElementById("searchGoalInput");
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const container = document.getElementById("goalsContainer");
    const emptyState = document.getElementById("emptyState");

    let filtered = allGoals;
    if (query) {
        filtered = filtered.filter(g => g.title.toLowerCase().includes(query));
    }

    container.innerHTML = "";

    if (!filtered || filtered.length === 0) {
        container.classList.add("d-none");
        emptyState.classList.remove("d-none");
        return;
    }

    emptyState.classList.add("d-none");
    container.classList.remove("d-none");

    filtered.forEach(goal => {
        const percent = Math.min(goal.progressPercentage || 0, 100);
        const isCompleted = goal.currentAmount >= goal.TargetAmount || percent >= 100;
        
        const badgeHtml = isCompleted 
            ? `<span class="badge bg-success text-white px-2.5 py-1.5" style="border-radius: 8px;">Tamamlandı 🎉</span>`
            : `<span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1.5" style="border-radius: 8px;">${percent}%</span>`;

        const progressBarClass = isCompleted ? "bg-success" : "bg-primary";

        const card = document.createElement("div");
        card.className = "col-md-6 col-lg-4";
        card.innerHTML = `
            <div class="card p-4 border-0 shadow-sm h-100 d-flex flex-column justify-content-between" style="border-radius: 20px; transition: transform 0.2s, box-shadow 0.2s;">
                <div>
                    <!-- Header -->
                    <div class="d-flex align-items-center justify-content-between mb-3">
                        <div class="d-flex align-items-center gap-2">
                            <div class="d-flex align-items-center justify-content-center text-primary rounded-circle" style="width: 40px; height: 40px; background: rgba(79, 70, 229, 0.12);">
                                <i class="bi bi-piggy-bank fs-5"></i>
                            </div>
                            <h6 class="fw-bold text-white mb-0">${escapeHtml(goal.title)}</h6>
                        </div>
                        ${badgeHtml}
                    </div>

                    <!-- Progress Bar -->
                    <div class="progress mb-3" style="height: 10px; border-radius: 6px; background-color: rgba(255, 255, 255, 0.08);">
                        <div class="progress-bar progress-bar-striped progress-bar-animated ${progressBarClass}" role="progressbar" style="width: ${percent}%; border-radius: 6px;"></div>
                    </div>

                    <!-- Amounts Info Box -->
                    <div class="row g-2 p-3 rounded-3 mb-3" style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);">
                        <div class="col-6">
                            <span class="text-muted small d-block" style="font-size: 0.75rem;">Yığılan</span>
                            <span class="fw-bold text-white fs-6">${goal.currentAmount.toFixed(2)} ₼</span>
                        </div>
                        <div class="col-6 border-start" style="border-color: rgba(255, 255, 255, 0.08) !important;">
                            <span class="text-muted small d-block" style="font-size: 0.75rem;">Hədəf</span>
                            <span class="fw-bold text-primary fs-6">${goal.targetAmount.toFixed(2)} ₼</span>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="d-flex gap-2 pt-2 border-top" style="border-color: rgba(255, 255, 255, 0.08) !important;">
                    <button class="btn btn-sm btn-success flex-grow-1 py-2 topup-btn d-flex align-items-center justify-content-center gap-1" style="border-radius: 10px; font-weight: 600;">
                        <i class="bi bi-plus-circle"></i> Pul At
                    </button>
                    <button class="btn btn-sm btn-warning flex-grow-1 py-2 withdraw-btn text-dark d-flex align-items-center justify-content-center gap-1" style="border-radius: 10px; font-weight: 600;" ${goal.currentAmount <= 0 ? 'disabled' : ''}>
                        <i class="bi bi-arrow-down-circle"></i> Çıxar
                    </button>
                    <button class="btn btn-sm btn-outline-danger px-2.5 py-2 delete-btn" style="border-radius: 10px;" title="Qutunu Sil">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;

        card.querySelector(".topup-btn").addEventListener("click", () => openTopUpModal(goal));
        card.querySelector(".withdraw-btn").addEventListener("click", () => openWithdrawModal(goal));
        card.querySelector(".delete-btn").addEventListener("click", () => deleteSavingsGoal(goal));

        container.appendChild(card);
    });
}

// 1. Create Goal
async function handleCreateGoal(e) {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    const errorBox = document.getElementById("createGoalErrorBox");
    if (errorBox) errorBox.classList.add("d-none");

    const title = document.getElementById("goalTitleInput").value.trim();
    const targetAmount = parseFloat(document.getElementById("goalTargetInput").value);

    try {
        const response = await fetch(`${API_BASE_URL}/SavingsGoal`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ title, targetAmount })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Qutu yaradılarkən xəta baş verdi.");

        bootstrap.Modal.getInstance(document.getElementById("createGoalModal")).hide();
        document.getElementById("createGoalForm").reset();

        showGlobalAlert("Yeni yığım qutunuz uğurla yaradıldı! 🎯", "success");
        await loadSavingsGoals(token);

    } catch (error) {
        if (errorBox) {
            errorBox.textContent = error.message;
            errorBox.classList.remove("d-none");
        }
    }
}

// 2. Open Top-Up Modal
function openTopUpModal(goal) {
    document.getElementById("topUpGoalId").value = goal.id;
    document.getElementById("topUpGoalTitleDisplay").textContent = goal.title;
    document.getElementById("topUpAmountInput").value = "";
    
    const errorBox = document.getElementById("topUpErrorBox");
    if (errorBox) errorBox.classList.add("d-none");

    const select = document.getElementById("topUpAccountSelect");
    select.innerHTML = '<option value="" disabled selected>Ödəniş üçün hesab seçin</option>';
    
    userAccounts.forEach(acc => {
        const typeName = acc.accountType === 0 ? "Əmanət" : "Cari";
        select.innerHTML += `<option value="${acc.id}">${typeName} - ${acc.accountNumber} (Balans: ${acc.balance.toFixed(2)} ₼)</option>`;
    });

    const modal = new bootstrap.Modal(document.getElementById("topUpModal"));
    modal.show();
}

// Handle Top-Up Submit
async function handleTopUp(e) {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    const goalId = document.getElementById("topUpGoalId").value;
    const accountId = parseInt(document.getElementById("topUpAccountSelect").value);
    const amount = parseFloat(document.getElementById("topUpAmountInput").value);
    const errorBox = document.getElementById("topUpErrorBox");

    if (errorBox) errorBox.classList.add("d-none");

    try {
        const response = await fetch(`${API_BASE_URL}/SavingsGoal/${goalId}/topup`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ accountId, amount })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Pul əlavə edilərkən xəta baş verdi.");

        bootstrap.Modal.getInstance(document.getElementById("topUpModal")).hide();
        document.getElementById("topUpForm").reset();

        showGlobalAlert(`${amount.toFixed(2)} AZN qutuya uğurla əlavə edildi! 💸`, "success");
        await loadUserAccounts(token);
        await loadSavingsGoals(token);

    } catch (error) {
        if (errorBox) {
            errorBox.textContent = error.message;
            errorBox.classList.remove("d-none");
        }
    }
}

// 3. Open Withdraw Modal
function openWithdrawModal(goal) {
    document.getElementById("withdrawGoalId").value = goal.id;
    document.getElementById("withdrawGoalTitleDisplay").textContent = goal.title;
    document.getElementById("withdrawGoalCurrentDisplay").textContent = `${goal.currentAmount.toFixed(2)} AZN`;
    document.getElementById("withdrawAmountInput").value = "";
    document.getElementById("withdrawAmountInput").max = goal.currentAmount;

    const errorBox = document.getElementById("withdrawErrorBox");
    if (errorBox) errorBox.classList.add("d-none");

    const select = document.getElementById("withdrawAccountSelect");
    select.innerHTML = '<option value="" disabled selected>Pulun köçəcəyi hesabı seçin</option>';
    
    userAccounts.forEach(acc => {
        const typeName = acc.accountType === 0 ? "Əmanət" : "Cari";
        select.innerHTML += `<option value="${acc.id}">${typeName} - ${acc.accountNumber} (Balans: ${acc.balance.toFixed(2)} ₼)</option>`;
    });

    const modal = new bootstrap.Modal(document.getElementById("withdrawModal"));
    modal.show();
}

// Handle Withdraw Submit
async function handleWithdraw(e) {
    e.preventDefault();
    const token = sessionStorage.getItem("token");
    const goalId = document.getElementById("withdrawGoalId").value;
    const accountId = parseInt(document.getElementById("withdrawAccountSelect").value);
    const amount = parseFloat(document.getElementById("withdrawAmountInput").value);
    const errorBox = document.getElementById("withdrawErrorBox");

    if (errorBox) errorBox.classList.add("d-none");

    try {
        const response = await fetch(`${API_BASE_URL}/SavingsGoal/${goalId}/withdraw`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ accountId, amount })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Pul çıxarılarkən xəta baş verdi.");

        bootstrap.Modal.getInstance(document.getElementById("withdrawModal")).hide();
        document.getElementById("withdrawForm").reset();

        showGlobalAlert(`${amount.toFixed(2)} AZN kartınıza uğurla köçürüldü! 💳`, "success");
        await loadUserAccounts(token);
        await loadSavingsGoals(token);

    } catch (error) {
        if (errorBox) {
            errorBox.textContent = error.message;
            errorBox.classList.remove("d-none");
        }
    }
}

// 4. Delete Goal (Təhlükəsiz Silmə / Auto-Refund)
async function deleteSavingsGoal(goal) {
    const token = sessionStorage.getItem("token");
    let confirmMsg = `"${goal.title}" adlı yığım qutusunu silmək istədiyinizə əminsiniz?`;
    
    if (goal.currentAmount > 0) {
        confirmMsg = `Bu qutuda ${goal.currentAmount.toFixed(2)} AZN vəsait var!\nQutunu sildikdə bu məbləğ avtomatik olaraq aktiv kartınıza geri qaytarılacaq.\n\nSilmək istədiyinizə əminsiniz?`;
    }

    if (!confirm(confirmMsg)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/SavingsGoal/${goal.id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Qutu silinərkən xəta baş verdi");

        showGlobalAlert(data.message || "Qutu uğurla silindi.", "success");
        await loadUserAccounts(token);
        await loadSavingsGoals(token);

    } catch (error) {
        showGlobalAlert(error.message, "danger");
    }
}

function showGlobalAlert(message, type) {
    const alertBox = document.getElementById("globalAlertBox");
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove("d-none");
    setTimeout(() => alertBox.classList.add("d-none"), 4000);
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}