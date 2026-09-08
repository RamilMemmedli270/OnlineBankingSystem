// ==========================================================================
// ONLINEBANK — ACCOUNTS & CARDS CONTROLLER (accounts.js)
// F2: Multiple account types (Savings, Current), balance management,
// in-place transfers, deposit, copy account number, dynamic cards carousel
// ==========================================================================

let userAccounts = [];
let selectedAccountId = null;
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

    // 4. Setup Modals (Create Account & Deposit)
    setupCreateAccountModal(token);
    setupDepositModal(token);

    // 5. Setup Quick In-Place Transfer
    setupQuickTransfer(token);

    // 6. Copy Account Number Button
    setupCopyButton();

    // 7. Load Dynamic Accounts
    await loadAccounts(token);

    // 8. Notifications check
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

// --- Load Dynamic Accounts from API ---
async function loadAccounts(token) {
    try {
        const res = await fetch(`${API_BASE_URL}/account`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            if (res.status === 401) {
                clearAuth();
                window.location.href = "index.html";
                return;
            }
            throw new Error("Hesablar alına bilmədi.");
        }

        userAccounts = await res.json();

        if (!userAccounts || userAccounts.length === 0) {
            renderEmptyAccountsState();
            return;
        }

        // Set default selected account if not set or not existing
        if (!selectedAccountId || !userAccounts.find(a => a.id === selectedAccountId)) {
            selectedAccountId = userAccounts[0].id;
        }

        // Render Cards Slider & Details
        renderCardsSlider(userAccounts);
        updateSelectedAccountDetails();
        populateTransferSelects(userAccounts);

    } catch (err) {
        console.error("Hesabları yükləmə xətası:", err);
    }
}

function renderEmptyAccountsState() {
    const container = document.getElementById("accountsCardsContainer");
    if (container) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 text-muted">
                <i class="bi bi-credit-card-2-front fs-1 d-block mb-3 text-muted"></i>
                <h5 class="text-white fw-bold">Heç bir bank hesabınız yoxdur</h5>
                <p class="small text-muted mb-3">Gündəlik xərclər və ya yığım üçün dərhal ilk hesabınızı açın.</p>
                <button type="button" class="btn-action-lime px-4 py-2" data-bs-toggle="modal" data-bs-target="#createAccountModal">
                    <i class="bi bi-plus-lg me-1"></i> İlk Hesabınızı Açın
                </button>
            </div>
        `;
    }
}

// --- Render Bank Cards (Matching Vaultix Screenshot) ---
function renderCardsSlider(accounts) {
    const container = document.getElementById("accountsCardsContainer");
    if (!container) return;

    container.innerHTML = "";
    const fullName = localStorage.getItem("fullName") || "MÜŞTƏRİ";

    // Card color themes for variety (matching screenshot: purple, blue, dark)
    const themes = ['theme-purple', 'theme-blue', 'theme-dark'];

    accounts.forEach((acc, idx) => {
        const isSelected = acc.id === selectedAccountId;
        const themeClass = themes[idx % themes.length];
        const isSavings = acc.accountType === 0;
        const typeLabel = isSavings ? "Əmanət" : "Cari";
        const network = isSavings ? "Mastercard" : "VISA";
        const num = acc.accountNumber || `ACC-${acc.id}`;
        
        let maskedNum = "•••• •••• •••• ••••";
        if (num.length >= 12) {
            maskedNum = `${num.slice(0, 4)} ${num.slice(4, 8)} ${num.slice(8, 12)} ${num.slice(-4)}`;
        } else {
            maskedNum = `5355 0348 5945 ${String(acc.id).padStart(4, '0')}`;
        }

        const balFormatted = formatMoney(acc.balance);

        const card = document.createElement("div");
        card.className = `bank-card-selectable ${themeClass} ${isSelected ? 'active-card' : ''}`;
        card.dataset.accountId = acc.id;

        card.innerHTML = `
            <span class="card-selected-badge">✓ Seçilib</span>
            
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="small fw-bold text-uppercase" style="letter-spacing: 1px; opacity: 0.85;">${typeLabel} • OnlineBank</span>
                <span class="small fw-bold font-monospace bg-black bg-opacity-25 px-2 py-1 rounded">₼ ${isBalanceHidden ? '••••' : balFormatted}</span>
            </div>

            <div class="card-chip-box mb-3"></div>

            <div class="card-number-embossed fs-5 mb-3" style="letter-spacing: 2px;">
                ${maskedNum}
            </div>

            <div class="d-flex justify-content-between align-items-end">
                <div>
                    <div class="card-label-small" style="font-size: 0.65rem; opacity: 0.7;">Kart Sahibi</div>
                    <div class="fw-bold small text-uppercase">${escapeHtml(fullName)}</div>
                </div>
                <div class="text-end">
                    <div class="fw-bold font-monospace" style="font-size: 0.75rem; opacity: 0.8;">12/29</div>
                    <div class="fw-bold fst-italic" style="font-size: 1.1rem; letter-spacing: 1px;">${network}</div>
                </div>
            </div>
        `;

        // Card Selection Event
        card.addEventListener("click", function () {
            selectedAccountId = acc.id;
            document.querySelectorAll(".bank-card-selectable").forEach(c => c.classList.remove("active-card"));
            this.classList.add("active-card");
            updateSelectedAccountDetails();
            populateTransferSelects(userAccounts);
        });

        container.appendChild(card);
    });
}

// --- Update Account Details Panel (Left Column) ---
function updateSelectedAccountDetails() {
    const acc = userAccounts.find(a => a.id === selectedAccountId);
    if (!acc) return;

    const typeEl = document.getElementById("detailAccountType");
    const numEl = document.getElementById("detailAccountNumber");
    const idEl = document.getElementById("detailAccountId");
    const balEl = document.getElementById("detailAccountBalance");
    const statusEl = document.getElementById("detailAccountStatusBadge");
    const dateEl = document.getElementById("detailAccountCreated");
    const depositBtn = document.getElementById("btnDepositSelected");

    const isSavings = acc.accountType === 0;
    if (typeEl) typeEl.textContent = isSavings ? "Əmanət Hesabı (Savings)" : "Cari Hesab (Checking / Current)";
    if (numEl) {
        numEl.textContent = acc.accountNumber || `AZ28OBBK${String(acc.id).padStart(16, '0')}`;
        numEl.dataset.fullNumber = acc.accountNumber || `AZ28OBBK${String(acc.id).padStart(16, '0')}`;
    }
    if (idEl) idEl.textContent = `#${acc.id}`;
    if (balEl) {
        balEl.textContent = isBalanceHidden ? "••••••" : `${formatMoney(acc.balance)} ₼`;
    }

    if (statusEl) {
        if (acc.status === 1) { // Frozen
            statusEl.textContent = "Dondurulub (Frozen)";
            statusEl.className = "badge bg-danger-subtle text-danger small px-2 py-1";
        } else {
            statusEl.textContent = "Aktiv (Active)";
            statusEl.className = "badge bg-success-subtle text-success small px-2 py-1";
        }
    }

    if (dateEl) {
        dateEl.textContent = formatDate(acc.createdAt || new Date().toISOString());
    }

    // Deposit Button Pre-selection
    if (depositBtn) {
        depositBtn.onclick = () => {
            const modalSelect = document.getElementById("depositTargetAccountSelect");
            if (modalSelect) modalSelect.value = acc.id;
            const depositModal = new bootstrap.Modal(document.getElementById("depositModal"));
            depositModal.show();
        };
    }
}

// --- Copy Account Number Button ---
function setupCopyButton() {
    const btn = document.getElementById("copyAccNumberBtn");
    if (!btn) return;

    btn.addEventListener("click", function () {
        const numEl = document.getElementById("detailAccountNumber");
        const fullNum = numEl ? (numEl.dataset.fullNumber || numEl.textContent) : "";
        if (fullNum) {
            navigator.clipboard.writeText(fullNum).then(() => {
                btn.innerHTML = '<i class="bi bi-check text-success"></i>';
                setTimeout(() => {
                    btn.innerHTML = '<i class="bi bi-copy"></i>';
                }, 1500);
            });
        }
    });
}

// --- Quick In-Place Transfer (Right Column) ---
function populateTransferSelects(accounts) {
    const fromSelect = document.getElementById("quickFromAccountSelect");
    const toSelect = document.getElementById("quickToAccountSelect");
    if (!fromSelect || !toSelect) return;

    fromSelect.innerHTML = "";
    toSelect.innerHTML = "";

    accounts.forEach(acc => {
        const typeLabel = acc.accountType === 0 ? "Əmanət" : "Cari";
        const num = acc.accountNumber ? acc.accountNumber.slice(-4) : acc.id;
        const opt = document.createElement("option");
        opt.value = acc.id;
        opt.textContent = `${typeLabel} (*${num}) — ₼ ${formatMoney(acc.balance)}`;
        fromSelect.appendChild(opt);
    });

    // Set selected card as From Account
    if (selectedAccountId) {
        fromSelect.value = selectedAccountId;
    }

    // Populate To Account with remaining accounts
    updateToAccountSelect();

    fromSelect.onchange = function () {
        selectedAccountId = parseInt(this.value);
        document.querySelectorAll(".bank-card-selectable").forEach(c => {
            if (parseInt(c.dataset.accountId) === selectedAccountId) {
                c.classList.add("active-card");
            } else {
                c.classList.remove("active-card");
            }
        });
        updateSelectedAccountDetails();
        updateToAccountSelect();
    };
}

function updateToAccountSelect() {
    const fromSelect = document.getElementById("quickFromAccountSelect");
    const toSelect = document.getElementById("quickToAccountSelect");
    if (!fromSelect || !toSelect) return;

    const fromId = parseInt(fromSelect.value);
    toSelect.innerHTML = '<option value="" disabled selected>Digər hesabınızı seçin...</option>';

    const candidates = userAccounts.filter(a => a.id !== fromId && a.status === 0);
    if (candidates.length === 0) {
        const opt = document.createElement("option");
        opt.disabled = true;
        opt.textContent = "Köçürmə üçün başqa aktiv hesabınız yoxdur";
        toSelect.appendChild(opt);
        return;
    }

    candidates.forEach(acc => {
        const typeLabel = acc.accountType === 0 ? "Əmanət" : "Cari";
        const num = acc.accountNumber ? acc.accountNumber.slice(-4) : acc.id;
        const opt = document.createElement("option");
        opt.value = acc.accountNumber;
        opt.textContent = `${typeLabel} Hesab (*${num}) — Qalıq: ₼ ${formatMoney(acc.balance)}`;
        toSelect.appendChild(opt);
    });
}

function setupQuickTransfer(token) {
    const form = document.getElementById("quickTransferForm");
    const amountInput = document.getElementById("quickAmountInput");
    const alertBox = document.getElementById("quickTransferAlert");
    const submitBtn = document.getElementById("quickTransferSubmitBtn");
    const quickPills = document.querySelectorAll(".quick-amt-pill");

    if (!form) return;

    // Quick Amount Pills
    quickPills.forEach(pill => {
        pill.addEventListener("click", function () {
            const amtType = this.dataset.amt;
            const fromAcc = userAccounts.find(a => a.id === selectedAccountId);
            if (amtType === "max") {
                if (fromAcc) {
                    amountInput.value = Math.max(0, Number(fromAcc.balance) || 0).toFixed(2);
                }
            } else {
                amountInput.value = parseFloat(amtType).toFixed(2);
            }
        });
    });

    // Form Submit
    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const fromId = parseInt(document.getElementById("quickFromAccountSelect").value);
        const toAccountNumber = document.getElementById("quickToAccountSelect").value;
        const amount = parseFloat(amountInput.value);

        if (!fromId || !toAccountNumber || isNaN(amount) || amount <= 0) {
            showAlert(alertBox, "Zəhmət olmasa hesabı və düzgün məbləği daxil edin.", "danger");
            return;
        }

        const fromAcc = userAccounts.find(a => a.id === fromId);
        if (fromAcc && fromAcc.status === 1) {
            showAlert(alertBox, "Göndərən hesab dondurulub! Əməliyyat aparıla bilməz.", "danger");
            return;
        }

        if (fromAcc && amount > (Number(fromAcc.balance) || 0)) {
            showAlert(alertBox, `Balansınız kifayət etmir! Mövcud: ${formatMoney(fromAcc.balance)} ₼`, "danger");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Köçürülür...';

        try {
            const res = await fetch(`${API_BASE_URL}/transaction/transfer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    fromAccountId: fromId,
                    toAccountNumber: toAccountNumber,
                    amount: amount,
                    description: "Şəxsi Hesablararası Daxili Köçürmə"
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Köçürmə uğursuz oldu.");
            }

            showAlert(alertBox, `Uğurlu! ${formatMoney(amount)} ₼ hesablar arasında köçürüldü.`, "success");
            amountInput.value = "";

            // Refresh account balances
            await loadAccounts(token);

            setTimeout(() => {
                alertBox.classList.add("d-none");
            }, 3000);

        } catch (err) {
            showAlert(alertBox, err.message, "danger");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-arrow-right-circle me-2"></i><span>Vəsaiti Köçür (Transfer Funds)</span>';
        }
    });
}

// --- Create Account Modal ---
function setupCreateAccountModal(token) {
    const form = document.getElementById("createAccountModalForm");
    const alertBox = document.getElementById("createAccModalAlert");
    const submitBtn = document.getElementById("createAccSubmitBtn");

    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const accountType = parseInt(document.getElementById("newAccType").value);
        const initialBalance = parseFloat(document.getElementById("newAccInitialBalance").value) || 0;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Açılır...';

        try {
            const res = await fetch(`${API_BASE_URL}/account`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    accountType: accountType,
                    initialBalance: initialBalance
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Hesab açıla bilmədi.");
            }

            const createdAcc = await res.json().catch(() => null);
            showAlert(alertBox, "Yeni bank hesabı uğurla açıldı!", "success");
            form.reset();

            if (createdAcc && createdAcc.id) {
                selectedAccountId = createdAcc.id;
            }

            setTimeout(async () => {
                const modalEl = document.getElementById("createAccountModal");
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                alertBox.classList.add("d-none");
                await loadAccounts(token);
            }, 1000);

        } catch (err) {
            showAlert(alertBox, err.message, "danger");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-plus-lg"></i> Hesab Aç';
        }
    });
}

// --- Deposit Modal ---
function setupDepositModal(token) {
    const form = document.getElementById("depositModalForm");
    const select = document.getElementById("depositTargetAccountSelect");
    const alertBox = document.getElementById("depositModalAlert");
    const submitBtn = document.getElementById("depositModalSubmitBtn");

    if (!form) return;

    // Populate Target Account options
    const populateDepositSelect = () => {
        if (!select) return;
        select.innerHTML = "";
        userAccounts.forEach(acc => {
            const typeLabel = acc.accountType === 0 ? "Əmanət" : "Cari";
            const num = acc.accountNumber ? acc.accountNumber.slice(-4) : acc.id;
            const opt = document.createElement("option");
            opt.value = acc.id;
            opt.textContent = `${typeLabel} Hesab (*${num}) — Balans: ₼ ${formatMoney(acc.balance)}`;
            select.appendChild(opt);
        });
        if (selectedAccountId) {
            select.value = selectedAccountId;
        }
    };

    const modalEl = document.getElementById("depositModal");
    if (modalEl) {
        modalEl.addEventListener("show.bs.modal", populateDepositSelect);
    }

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const accountId = parseInt(select.value);
        const amount = parseFloat(document.getElementById("depositModalAmount").value);
        const description = document.getElementById("depositModalDescription").value.trim();

        if (!accountId || isNaN(amount) || amount <= 0) {
            showAlert(alertBox, "Düzgün məbləğ seçin.", "danger");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>İcra olunur...';

        try {
            const res = await fetch(`${API_BASE_URL}/transaction/deposit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    accountId: accountId,
                    amount: amount,
                    description: description || "Hesab Balansını Artırma (Mədaxil)"
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Mədaxil əməliyyatı baş tutmadı.");
            }

            showAlert(alertBox, `Uğurlu! ${formatMoney(amount)} ₼ hesaba mədaxil edildi.`, "success");
            form.reset();

            setTimeout(async () => {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                alertBox.classList.add("d-none");
                await loadAccounts(token);
            }, 1000);

        } catch (err) {
            showAlert(alertBox, err.message, "danger");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check2-circle"></i> Təsdiq et';
        }
    });
}

// --- Toggle Balance Visibility Eye ---
function toggleBalanceVisibility() {
    isBalanceHidden = !isBalanceHidden;
    const icon = document.getElementById("toggleEyeIcon");
    if (icon) {
        icon.className = isBalanceHidden ? "bi bi-eye-slash" : "bi bi-eye";
    }
    renderCardsSlider(userAccounts);
    updateSelectedAccountDetails();
}

// --- Formatters & Helpers ---
function formatMoney(val) {
    return Number(val || 0).toLocaleString('az-AZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

function showAlert(box, msg, type) {
    if (!box) return;
    box.className = `alert alert-${type} mt-3`;
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
        // Silent error handling for notifications
    }
}
