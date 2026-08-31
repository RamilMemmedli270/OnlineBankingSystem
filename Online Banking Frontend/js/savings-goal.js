document.addEventListener("DOMContentLoaded", async function () {
    const token = sessionStorage.getItem("token");

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    const roles = JSON.parse(sessionStorage.getItem("roles") || "[]");
    
    // Redirect Admin if they try to access this page
    if (roles.includes("Admin") && !roles.includes("Customer")) {
        window.location.href = "dashboard.html";
        return;
    }

    // Hide Customer links for Admin in sidebars
    if (roles.includes("Admin")) {
        const restrictedNavIds = ["navAccounts", "navTransfer", "navTransactions", "navLoans", "navNotifications", "navBalanceAlert", "navSavingsGoal"];
        restrictedNavIds.forEach(function (id) {
            const el = document.getElementById(id);
            if (el) el.style.display = "none";
        });
    }

    // Load accounts to populate selector
    await loadAccountsForGoal(token);

    // Load savings goal
    await loadSavingsGoal(token);

    // Create Goal form submit
    const createGoalForm = document.getElementById("createGoalForm");
    if (createGoalForm) {
        createGoalForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            const modalGoalErrorBox = document.getElementById("modalGoalErrorBox");
            if (modalGoalErrorBox) modalGoalErrorBox.classList.add("d-none");

            const title = document.getElementById("goalTitleInput").value;
            const targetAmount = parseFloat(document.getElementById("goalTargetInput").value);
            const accountId = parseInt(document.getElementById("goalAccountSelect").value);

            try {
                const response = await fetch(`${API_BASE_URL}/SavingsGoal`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ title, targetAmount, accountId })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Hədəf yaradılarkən xəta baş verdi");
                }

                // Hide modal
                const modalEl = document.getElementById("createGoalModal");
                const modal = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
                modal.hide();
                createGoalForm.reset();

                // Refresh savings goal card
                await loadSavingsGoal(token);

            } catch (error) {
                if (modalGoalErrorBox) {
                    modalGoalErrorBox.textContent = error.message;
                    modalGoalErrorBox.classList.remove("d-none");
                }
            }
        });
    }
});

async function loadAccountsForGoal(token) {
    const goalAccountSelect = document.getElementById("goalAccountSelect");
    if (!goalAccountSelect) return;

    try {
        const response = await fetch(`${API_BASE_URL}/account`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Hesablar yüklənə bilmədi");

        const accounts = await response.json();
        
        goalAccountSelect.innerHTML = '<option value="" disabled selected>Hesab seçin</option>';
        accounts.forEach(acc => {
            const typeLabel = acc.accountType === 0 ? "Əmanət" : "Cari";
            goalAccountSelect.innerHTML += `<option value="${acc.id}">${typeLabel} - ${acc.accountNumber} (${acc.balance.toFixed(2)} AZN)</option>`;
        });

    } catch (error) {
        console.error("Hesabların yüklənməsi xətası:", error);
    }
}

async function loadSavingsGoal(token) {
    const loadingState = document.getElementById("loadingState");
    const mainContainer = document.getElementById("mainContainer");
    const goalEmptyState = document.getElementById("goalEmptyState");
    const goalActiveState = document.getElementById("goalActiveState");
    const deleteGoalBtn = document.getElementById("deleteGoalBtn");

    if (!goalEmptyState || !goalActiveState) return;

    if (loadingState) loadingState.classList.remove("d-none");
    if (mainContainer) mainContainer.classList.add("d-none");

    try {
        const res = await fetch(`${API_BASE_URL}/SavingsGoal`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Hədəflər yüklənərkən xəta baş verdi");

        const goals = await res.json();
        const goal = goals && goals.length > 0 ? goals[0] : null;

        if (loadingState) loadingState.classList.add("d-none");
        if (mainContainer) mainContainer.classList.remove("d-none");

        if (goal) {
            goalEmptyState.classList.add("d-none");
            goalActiveState.classList.remove("d-none");
            if (deleteGoalBtn) {
                deleteGoalBtn.classList.remove("d-none");
                deleteGoalBtn.onclick = () => deleteSavingsGoal(token, goal.id);
            }

            document.getElementById("goalTitle").textContent = goal.title;
            document.getElementById("goalProgressPercent").textContent = `${goal.progressPercentage}%`;
            document.getElementById("goalProgressBar").style.width = `${Math.min(goal.progressPercentage, 100)}%`;
            document.getElementById("goalCurrentAmount").textContent = `${goal.currentBalance.toFixed(2)} AZN`;
            document.getElementById("goalTargetAmount").textContent = `${goal.targetAmount.toFixed(2)} AZN`;
            document.getElementById("goalLinkedAccount").textContent = goal.accountNumber;
            
            // Adjust progress bar color classes if needed
            const bar = document.getElementById("goalProgressBar");
            const statusBadge = document.getElementById("goalStatusBadge");
            if (goal.progressPercentage >= 100) {
                bar.classList.replace("bg-primary", "bg-success");
                if (statusBadge) {
                    statusBadge.textContent = "Tamamlandı";
                    statusBadge.className = "badge bg-success text-white border border-success px-2.5 py-1.5";
                }
            } else {
                bar.classList.replace("bg-success", "bg-primary");
                if (statusBadge) {
                    statusBadge.textContent = "İcra Olunur";
                    statusBadge.className = "badge bg-success-subtle text-success border border-success-subtle";
                }
            }
        } else {
            goalEmptyState.classList.remove("d-none");
            goalActiveState.classList.add("d-none");
            if (deleteGoalBtn) deleteGoalBtn.classList.add("d-none");
        }
    } catch (error) {
        if (loadingState) loadingState.classList.add("d-none");
        console.error("Yığım hədəfi yüklənərkən xəta:", error);
    }
}

async function deleteSavingsGoal(token, goalId) {
    if (!confirm("Bu yığım hədəfini silmək istədiyinizdən əminsiniz?")) return;

    try {
        const res = await fetch(`${API_BASE_URL}/SavingsGoal/${goalId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || "Hədəf silinərkən xəta baş verdi");
        }

        loadSavingsGoal(token);
    } catch (error) {
        alert(error.message);
    }
}
