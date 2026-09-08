// ==========================================================================
// ONLINEBANK — SAVINGS GOALS CONTROLLER (savings-goal.js)
// Prime Pay Layout: Cards grid, dynamic progress, top-up, withdraw, delete & refund
// ==========================================================================

let userGoals = [];
let userAccounts = [];
let activeGoalForModal = null;
let isBalanceHidden = false;

document.addEventListener("DOMContentLoaded", async function () {
    const token = getAuthToken();

    // 1. Auth Guard
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // 2. Profile, Date & Logout
    setupUserProfile();
    setupCurrentDate();
    setupLogoutHandlers();

    // 3. Eye Toggle for Balance
    const eyeBtn = document.getElementById("toggleBalanceVisibilityBtn");
    if (eyeBtn) {
        eyeBtn.addEventListener("click", toggleBalanceVisibility);
    }

    // 4. Setup Modals (Create, Top-up, Withdraw)
    setupCreateGoalModal(token);
    setupTopUpModal(token);
    setupWithdrawModal(token);

    // 5. Load Dynamic Data
    await loadInitialData(token);

    // 6. Notifications check
    loadUnreadNotifications(token);
});

// --- Profile & Identity ---
function setupUserProfile() {
    const fullName = getAuthFullName();
    const roles = getAuthRoles();
    const isAdmin = roles.includes("Admin");
    const avatarLetter = fullName.charAt(0).toUpperCase();

    const nameEl = document.getElementById("userFullName");
    const roleEl = document.getElementById("userRole");
    const avatarEl = document.getElementById("userAvatar");
    const adminNav = document.getElementById("adminNavWrapper");

    if (nameEl) nameEl.textContent = fullName;
    if (roleEl) roleEl.textContent = isAdmin ? "Administrator" : "Müştəri";
    if (avatarEl) avatarEl.textContent = avatarLetter;

    if (adminNav && isAdmin) {
        adminNav.style.display = "block";
    }
}

function setupCurrentDate() {
    const dateEl = document.getElementById("currentDateDisplay");
    if (!dateEl) return;
    const now = new Date();
    const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
    dateEl.textContent = `${months[now.getMonth()]} ${now.getFullYear()}`;
}

function setupLogoutHandlers() {
    const logout = (e) => {
        e.preventDefault();
        clearAuth();
        window.location.href = "index.html";
    };
    const btn1 = document.getElementById("dashLogoutBtn");
    const btn2 = document.getElementById("dropdownLogoutBtn");
    if (btn1) btn1.addEventListener("click", logout);
    if (btn2) btn2.addEventListener("click", logout);
}

// --- Load Dynamic Accounts & Goals ---
async function loadInitialData(token) {
    try {
        // Step A: Load Accounts
        const accRes = await fetch(`${API_BASE_URL}/account`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (accRes.ok) {
            userAccounts = await accRes.json();
            populateAccountDropdowns(userAccounts);
        }

        // Step B: Load Goals
        await loadGoals(token);

    } catch (err) {
        console.error("Məlumat yükləmə xətası:", err);
    }
}

async function loadGoals(token) {
    const container = document.getElementById("goalsCardsContainer");
    try {
        const res = await fetch(`${API_BASE_URL}/savingsgoal`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            if (res.status === 401) {
                clearAuth();
                window.location.href = "index.html";
                return;
            }
            throw new Error("Yığım qutuları alına bilmədi.");
        }

        userGoals = await res.json();
        renderOverviewMetrics(userGoals);
        renderGoalsCards(userGoals, token);

    } catch (err) {
        if (container) {
            container.innerHTML = `<div class="col-12 text-center text-danger py-4">${err.message}</div>`;
        }
    }
}

function populateAccountDropdowns(accounts) {
    const topUpSelect = document.getElementById("topUpAccountSelect");
    const withdrawSelect = document.getElementById("withdrawAccountSelect");

    if (topUpSelect) topUpSelect.innerHTML = "";
    if (withdrawSelect) withdrawSelect.innerHTML = "";

    const activeAccounts = accounts.filter(a => a.status === 0);

    activeAccounts.forEach(acc => {
        const typeName = acc.accountType === 0 ? "Əmanət" : "Cari";
        const num = acc.accountNumber ? acc.accountNumber.slice(-4) : acc.id;
        const text = `${typeName} Hesab (*${num}) — Balans: ₼ ${formatMoney(acc.balance)}`;

        if (topUpSelect) {
            const opt1 = document.createElement("option");
            opt1.value = acc.id;
            opt1.textContent = text;
            topUpSelect.appendChild(opt1);
        }

        if (withdrawSelect) {
            const opt2 = document.createElement("option");
            opt2.value = acc.id;
            opt2.textContent = text;
            withdrawSelect.appendChild(opt2);
        }
    });
}

// --- Render Overview Metrics ---
function renderOverviewMetrics(goals) {
    let totalSaved = 0;
    let totalTarget = 0;

    goals.forEach(g => {
        totalSaved += (Number(g.currentAmount) || 0);
        totalTarget += (Number(g.targetAmount) || 0);
    });

    const avgProgress = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

    const savedEl = document.getElementById("overviewTotalSaved");
    const targetEl = document.getElementById("overviewTotalTarget");
    const progressEl = document.getElementById("overviewAvgProgress");

    if (savedEl) savedEl.textContent = isBalanceHidden ? "••••••" : `${formatMoney(totalSaved)} ₼`;
    if (targetEl) targetEl.textContent = `${formatMoney(totalTarget)} ₼`;
    if (progressEl) progressEl.textContent = `${avgProgress}%`;
}

// --- Render Prime Pay Goal Cards ---
function renderGoalsCards(goals, token) {
    const container = document.getElementById("goalsCardsContainer");
    if (!container) return;

    container.innerHTML = "";

    if (!goals || goals.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 text-muted">
                <i class="bi bi-piggy-bank fs-1 d-block mb-3 text-muted"></i>
                <h5 class="text-white fw-bold">Aktiv Yığım Qutunuz Yoxdur</h5>
                <p class="small text-muted mb-3">Yeni hədəf təyin edin, müntəzəm vəsait toplayın və arzularınızı reallaşdırın.</p>
                <button type="button" class="btn-action-lime px-4 py-2" data-bs-toggle="modal" data-bs-target="#createGoalModal">
                    <i class="bi bi-plus-lg me-1"></i> İlk Hədəf Qutusunu Açın
                </button>
            </div>
        `;
        return;
    }

    goals.forEach(goal => {
        const card = createPrimeGoalCard(goal, token);
        container.appendChild(card);
    });
}

function createPrimeGoalCard(goal, token) {
    const card = document.createElement("div");
    
    const target = Number(goal.targetAmount) || 0;
    const current = Number(goal.currentAmount) || 0;
    const percent = Math.min(100, Math.max(0, Math.round(goal.progressPercentage || (target > 0 ? (current / target) * 100 : 0))));
    const remaining = Math.max(0, target - current);
    const isCompleted = current >= target && target > 0;

    card.className = `goal-card-prime ${isCompleted ? 'completed' : ''}`;

    // Category style mapping
    const titleLower = (goal.title || "").toLowerCase();
    let categoryClass = "general";
    let iconBi = "bi-piggy-bank";

    if (titleLower.includes("tətil") || titleLower.includes("vacation")) {
        categoryClass = "vacation";
        iconBi = "bi-sun-fill";
    } else if (titleLower.includes("avto") || titleLower.includes("car")) {
        categoryClass = "car";
        iconBi = "bi-car-front-fill";
    } else if (titleLower.includes("fond") || titleLower.includes("emergency")) {
        categoryClass = "emergency";
        iconBi = "bi-shield-check";
    } else if (titleLower.includes("təhsil") || titleLower.includes("education")) {
        categoryClass = "education";
        iconBi = "bi-mortarboard-fill";
    } else if (titleLower.includes("invest")) {
        categoryClass = "investment";
        iconBi = "bi-graph-up-arrow";
    }

    const savedFormatted = isBalanceHidden ? "••••" : formatMoney(current);
    const remainingFormatted = isBalanceHidden ? "••••" : formatMoney(remaining);

    card.innerHTML = `
        <div>
            <!-- Header Top -->
            <div class="goal-header-top">
                <div class="d-flex align-items-center gap-3">
                    <div class="goal-icon-box ${categoryClass}">
                        <i class="bi ${iconBi}"></i>
                    </div>
                    <div>
                        <h4 class="goal-title-h4">${escapeHtml(goal.title)}</h4>
                        <span class="text-muted small">${isCompleted ? 'Hədəf tamamlandı! 🎯' : 'Aktiv Yığım'}</span>
                    </div>
                </div>
                <span class="goal-badge-percent">${percent}%</span>
            </div>

            <!-- Amounts Flex -->
            <div class="goal-amounts-flex">
                <div class="goal-saved-val">₼ ${savedFormatted}</div>
                <div class="goal-target-sub">Hədəf: <strong>₼ ${formatMoney(target)}</strong></div>
            </div>

            <!-- Progress Bar -->
            <div class="goal-progress-wrap">
                <div class="goal-progress-fill" style="width: ${percent}%;"></div>
            </div>

            <!-- Meta Footer -->
            <div class="goal-meta-footer">
                <span>Qalan: <strong>₼ ${remainingFormatted}</strong></span>
                <span>ID: #${goal.id}</span>
            </div>
        </div>

        <!-- 3 Quick Action Buttons: Top Up, Withdraw, Delete -->
        <div class="goal-actions-group">
            <button type="button" class="btn-goal-action btn-topup">
                <i class="bi bi-plus-lg text-success"></i> Artır
            </button>
            <button type="button" class="btn-goal-action btn-withdraw" ${current <= 0 ? 'disabled style="opacity:0.5;"' : ''}>
                <i class="bi bi-dash-lg text-info"></i> Çıxar
            </button>
            <button type="button" class="btn-goal-action delete btn-delete" title="Qutunu Ləğv Et (Vəsait karta qayıdır)">
                <i class="bi bi-trash3 text-danger"></i>
            </button>
        </div>
    `;

    // Event: Top Up
    card.querySelector(".btn-topup").addEventListener("click", () => {
        openTopUpModal(goal);
    });

    // Event: Withdraw
    card.querySelector(".btn-withdraw").addEventListener("click", () => {
        if (current > 0) {
            openWithdrawModal(goal);
        }
    });

    // Event: Delete Goal (Safe refund via backend)
    card.querySelector(".btn-delete").addEventListener("click", () => {
        confirmDeleteGoal(goal, token);
    });

    return card;
}

// --- Create Goal Modal ---
function setupCreateGoalModal(token) {
    const form = document.getElementById("createGoalForm");
    const alertBox = document.getElementById("createGoalAlert");
    const submitBtn = document.getElementById("btnSubmitCreateGoal");
    const titleInput = document.getElementById("goalTitleInput");
    const presetPills = document.querySelectorAll(".goal-preset-pill");

    presetPills.forEach(pill => {
        pill.addEventListener("click", function () {
            if (titleInput) {
                titleInput.value = this.dataset.title;
            }
        });
    });

    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const title = titleInput.value.trim();
        const targetAmount = parseFloat(document.getElementById("goalTargetAmountInput").value);

        if (!title || isNaN(targetAmount) || targetAmount <= 0) {
            showAlert(alertBox, "Hədəfin adını və düzgün hədəf məbləğini daxil edin.", "danger");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Yaradılır...';

        try {
            const res = await fetch(`${API_BASE_URL}/savingsgoal`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: title,
                    targetAmount: targetAmount
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Yığım qutusu yaradıla bilmədi.");
            }

            showAlert(alertBox, "Yeni yığım qutunuz uğurla açıldı!", "success");
            form.reset();

            setTimeout(async () => {
                const modalEl = document.getElementById("createGoalModal");
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                alertBox.classList.add("d-none");
                await loadGoals(token);
            }, 1000);

        } catch (err) {
            showAlert(alertBox, err.message, "danger");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check2-circle"></i> Qutunu Aç';
        }
    });
}

// --- Top Up Modal Logic ---
function openTopUpModal(goal) {
    activeGoalForModal = goal;
    document.getElementById("topUpGoalTitleDisplay").textContent = `${goal.title} (Hədəf: ₼ ${formatMoney(goal.targetAmount)})`;
    document.getElementById("topUpAmountInput").value = "";
    document.getElementById("topUpGoalAlert").classList.add("d-none");

    const modal = new bootstrap.Modal(document.getElementById("topUpGoalModal"));
    modal.show();
}

function setupTopUpModal(token) {
    const form = document.getElementById("topUpGoalForm");
    const alertBox = document.getElementById("topUpGoalAlert");
    const submitBtn = document.getElementById("btnSubmitTopUp");
    const amountInput = document.getElementById("topUpAmountInput");
    const quickPills = document.querySelectorAll(".topup-quick-pill");

    quickPills.forEach(pill => {
        pill.addEventListener("click", function () {
            amountInput.value = parseFloat(this.dataset.amt).toFixed(2);
        });
    });

    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        if (!activeGoalForModal) return;

        const accountId = parseInt(document.getElementById("topUpAccountSelect").value);
        const amount = parseFloat(amountInput.value);

        if (!accountId || isNaN(amount) || amount <= 0) {
            showAlert(alertBox, "Zəhmət olmasa hesabı və düzgün məbləği seçin.", "danger");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Köçürülür...';

        try {
            const res = await fetch(`${API_BASE_URL}/savingsgoal/${activeGoalForModal.id}/topup`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    accountId: accountId,
                    amount: amount
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Qutuya vəsait əlavə edilə bilmədi.");
            }

            showAlert(alertBox, `Uğurlu! ${formatMoney(amount)} ₼ qutuya əlavə edildi.`, "success");

            setTimeout(async () => {
                const modalEl = document.getElementById("topUpGoalModal");
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                alertBox.classList.add("d-none");
                await loadGoals(token);
            }, 1000);

        } catch (err) {
            showAlert(alertBox, err.message, "danger");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-arrow-down-circle"></i> Qutuya Köçür';
        }
    });
}

// --- Withdraw Modal Logic ---
function openWithdrawModal(goal) {
    activeGoalForModal = goal;
    document.getElementById("withdrawGoalAvailableDisplay").textContent = `₼ ${formatMoney(goal.currentAmount)}`;
    const amtInput = document.getElementById("withdrawAmountInput");
    amtInput.value = "";
    amtInput.max = goal.currentAmount;
    document.getElementById("withdrawGoalAlert").classList.add("d-none");

    // Withdraw all button
    const btnAll = document.getElementById("btnWithdrawAll");
    if (btnAll) {
        btnAll.onclick = () => {
            amtInput.value = Number(goal.currentAmount).toFixed(2);
        };
    }

    const modal = new bootstrap.Modal(document.getElementById("withdrawGoalModal"));
    modal.show();
}

function setupWithdrawModal(token) {
    const form = document.getElementById("withdrawGoalForm");
    const alertBox = document.getElementById("withdrawGoalAlert");
    const submitBtn = document.getElementById("btnSubmitWithdraw");
    const amountInput = document.getElementById("withdrawAmountInput");

    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        if (!activeGoalForModal) return;

        const accountId = parseInt(document.getElementById("withdrawAccountSelect").value);
        const amount = parseFloat(amountInput.value);

        if (!accountId || isNaN(amount) || amount <= 0) {
            showAlert(alertBox, "Düzgün hesab və çıxarılacaq məbləğ seçin.", "danger");
            return;
        }

        if (amount > (Number(activeGoalForModal.currentAmount) || 0)) {
            showAlert(alertBox, "Qutudakı məbləğdən artıq vəsait çıxara bilməzsiniz.", "danger");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Geri qaytarılır...';

        try {
            const res = await fetch(`${API_BASE_URL}/savingsgoal/${activeGoalForModal.id}/withdraw`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    accountId: accountId,
                    amount: amount
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Vəsaiti çıxarmaq mümkün olmadı.");
            }

            showAlert(alertBox, `Uğurlu! ${formatMoney(amount)} ₼ hesabınıza qaytarıldı.`, "success");

            setTimeout(async () => {
                const modalEl = document.getElementById("withdrawGoalModal");
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                alertBox.classList.add("d-none");
                await loadGoals(token);
            }, 1000);

        } catch (err) {
            showAlert(alertBox, err.message, "danger");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-arrow-up-right"></i> Hesaba Qaytar';
        }
    });
}

// --- Delete Goal with Safe Refund ---
async function confirmDeleteGoal(goal, token) {
    const current = Number(goal.currentAmount) || 0;
    let msg = `"${goal.title}" yığım qutusunu ləğv etmək istədiyinizə əminsiniz?`;
    if (current > 0) {
        msg += `\n\nQutudakı ${formatMoney(current)} ₼ məbləğ avtomatik olaraq aktiv bank hesabınıza qaytarılacaq və heç bir vəsait itməyəcək.`;
    }

    if (!confirm(msg)) return;

    try {
        const res = await fetch(`${API_BASE_URL}/savingsgoal/${goal.id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || "Qutu silinə bilmədi.");
        }

        alert("Yığım qutusu uğurla silindi və qalıq məbləğ hesabınıza qaytarıldı.");
        await loadGoals(token);

    } catch (err) {
        alert(err.message);
    }
}

// --- Toggle Balance Visibility Eye ---
function toggleBalanceVisibility() {
    isBalanceHidden = !isBalanceHidden;
    const icon = document.getElementById("toggleEyeIcon");
    if (icon) {
        icon.className = isBalanceHidden ? "bi bi-eye-slash" : "bi bi-eye";
    }
    renderOverviewMetrics(userGoals);
    renderGoalsCards(userGoals, getAuthToken());
}

// --- Formatters & Helpers ---
function formatMoney(val) {
    return Number(val || 0).toLocaleString('az-AZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function showAlert(box, msg, type) {
    if (!box) return;
    box.className = `alert alert-${type} mb-3`;
    box.textContent = msg;
    box.classList.remove("d-none");
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m];
    });
}

// --- Notifications Badge ---
async function loadUnreadNotifications(token) {
    try {
        const res = await fetch(`${API_BASE_URL}/notification/unread`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
            const notifications = await res.json();
            const count = notifications ? notifications.length : 0;
            const badge = document.getElementById("sidebarNotificationBadge");
            const dot = document.getElementById("unreadBadgeDot");

            if (count > 0) {
                if (badge) {
                    badge.textContent = count;
                    badge.style.display = "inline-block";
                }
                if (dot) {
                    dot.style.display = "block";
                }
            }
        }
    } catch (e) {
        // Silent
    }
}