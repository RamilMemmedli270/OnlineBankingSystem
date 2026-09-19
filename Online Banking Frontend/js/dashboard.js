// ==========================================================================
// ONLINEBANK — DASHBOARD CONTROLLER (Zentro Layout + Dark/Lime Brand)
// Strictly dynamic data from real backend APIs. No fake / hardcoded names.
// ==========================================================================

let userAccounts = [];
let allTransactions = [];
let isBalanceHidden = false;
let cashFlowChartInstance = null;

document.addEventListener("DOMContentLoaded", async function () {
    const token = getAuthToken();

    // 1. Auth Guard
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // 2. Profile and Date setup
    setupUserProfile();
    setupCurrentDate();

    // 3. Logout Handlers
    setupLogoutHandlers();

    // 4. Eye Toggle for Balance Visibility
    const eyeBtn = document.getElementById("toggleBalanceVisibilityBtn");
    if (eyeBtn) {
        eyeBtn.addEventListener("click", toggleBalanceVisibility);
    }

    // 5. Search Filter on Transactions
    const searchInput = document.getElementById("dashSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", filterTransactions);
    }

    // 6. Form submissions (Deposit & Create Account)
    setupDepositForm(token);
    setupCreateAccountForm(token);

    // 7. Load Dynamic Data
    await loadDashboardData(token);

    // 8. Notification Badge check
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
    const dropdownName = document.getElementById("profileDropdownName");
    const dropdownRole = document.getElementById("profileDropdownRole");
    const adminNav = document.getElementById("adminNavWrapper");
    const cardHolder = document.getElementById("primaryCardHolder");

    if (nameEl) nameEl.textContent = fullName;
    if (roleEl) roleEl.textContent = isAdmin ? "Administrator" : "Müştəri";
    if (avatarEl) avatarEl.textContent = avatarLetter;
    if (dropdownName) dropdownName.textContent = fullName;
    if (dropdownRole) dropdownRole.textContent = isAdmin ? "Bank Administratoru" : "OnlineBank Müştərisi";
    if (cardHolder) cardHolder.textContent = fullName.toUpperCase();

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


// --- Dynamic Data Fetching ---
async function loadDashboardData(token) {
    try {
        // Step A: Load User Accounts
        const accRes = await fetch(`${API_BASE_URL}/account`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!accRes.ok) {
            if (accRes.status === 401) {
                clearAuth();
                window.location.href = "index.html";
                return;
            }
            throw new Error("Hesab məlumatları alına bilmədi.");
        }

        userAccounts = await accRes.json();
        renderTopBalanceCards(userAccounts);
        renderPrimaryDebitCard(userAccounts);
        populateDepositAccountSelect(userAccounts);

        // Step B: Load Transactions for each Account
        allTransactions = [];
        if (userAccounts && userAccounts.length > 0) {
            const txPromises = userAccounts.map(acc => 
                fetch(`${API_BASE_URL}/transaction/account/${acc.id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                })
                .then(r => r.ok ? r.json() : [])
                .catch(() => [])
            );

            const txResults = await Promise.all(txPromises);
            const seenIds = new Set();
            txResults.flat().forEach(t => {
                if (t && t.id && !seenIds.has(t.id)) {
                    seenIds.add(t.id);
                    allTransactions.push(t);
                }
            });

            // Sort descending by date
            allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        // Step C: Render Transactions Table & Cash Flow Chart
        renderTransactionsTable(allTransactions);
        renderCashFlowChart(allTransactions);

    } catch (err) {
        console.error("Dashboard məlumat yükləmə xətası:", err);
    }
}

// --- Top 3 Balance Cards ---
function renderTopBalanceCards(accounts) {
    let currentTotal = 0;
    let savingsTotal = 0;
    let savingsCount = 0;

    accounts.forEach(acc => {
        const bal = Number(acc.balance) || 0;
        if (acc.accountType === 1) { // 1 = Current
            currentTotal += bal;
        } else { // 0 = Savings
            savingsTotal += bal;
            savingsCount++;
        }
    });

    const netTotal = currentTotal + savingsTotal;

    const currentEl = document.getElementById("currentAccountBalance");
    const savingsEl = document.getElementById("savingsAccountBalance");
    const netEl = document.getElementById("totalNetBalance");
    const savingsCountEl = document.getElementById("savingsCountText");

    if (currentEl) {
        currentEl.dataset.amount = currentTotal.toFixed(2);
    }
    if (savingsEl) {
        savingsEl.dataset.amount = savingsTotal.toFixed(2);
    }
    if (netEl) {
        netEl.dataset.amount = netTotal.toFixed(2);
    }
    if (savingsCountEl) {
        savingsCountEl.textContent = `${savingsCount} yığım hesabı`;
    }

    updateBalancesDisplay();
}

function updateBalancesDisplay() {
    const currentEl = document.getElementById("currentAccountBalance");
    const savingsEl = document.getElementById("savingsAccountBalance");
    const netEl = document.getElementById("totalNetBalance");

    if (isBalanceHidden) {
        if (currentEl) currentEl.textContent = "••••••";
        if (savingsEl) savingsEl.textContent = "••••••";
        if (netEl) netEl.textContent = "••••••••";
    } else {
        if (currentEl) {
            const val = parseFloat(currentEl.dataset.amount) || 0;
            currentEl.textContent = `${formatMoney(val)} ₼`;
        }
        if (savingsEl) {
            const val = parseFloat(savingsEl.dataset.amount) || 0;
            savingsEl.textContent = `${formatMoney(val)} ₼`;
        }
        if (netEl) {
            const val = parseFloat(netEl.dataset.amount) || 0;
            netEl.textContent = `${formatMoney(val)} ₼`;
        }
    }
}

function toggleBalanceVisibility() {
    isBalanceHidden = !isBalanceHidden;
    const icon = document.getElementById("toggleEyeIcon");
    if (icon) {
        icon.className = isBalanceHidden ? "bi bi-eye-slash" : "bi bi-eye";
    }
    updateBalancesDisplay();
}

function formatMoney(amount) {
    return Number(amount).toLocaleString('az-AZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// --- Primary Debit Card Visual ---
function renderPrimaryDebitCard(accounts) {
    const cardNumberEl = document.getElementById("primaryCardNumber");
    if (!cardNumberEl) return;

    if (!accounts || accounts.length === 0) {
        cardNumberEl.textContent = "•••• •••• •••• ••••";
        return;
    }

    const primeAcc = accounts[0];
    const accNumber = primeAcc.accountNumber || "";
    if (accNumber.length >= 12) {
        cardNumberEl.textContent = `${accNumber.slice(0, 4)} •••• •••• ${accNumber.slice(-4)}`;
    } else {
        cardNumberEl.textContent = `4169 •••• •••• ${String(primeAcc.id).padStart(4, '0')}`;
    }
}

// --- Recent Transactions Table ---
function renderTransactionsTable(transactions) {
    const tbody = document.getElementById("recentTransactionsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-5 text-muted">
                    <i class="bi bi-receipt fs-2 d-block mb-2 text-muted"></i>
                    <span>Hələlik heç bir əməliyyat qeydə alınmayıb.</span>
                </td>
            </tr>
        `;
        return;
    }

    const recent = transactions.slice(0, 6);
    recent.forEach(t => {
        const tr = createTransactionRow(t);
        tbody.appendChild(tr);
    });
}

function createTransactionRow(t) {
    const tr = document.createElement("tr");

    const myAccountIds = new Set(userAccounts.map(a => a.id));
    const isDeposit = (t.transactionType === 1 || t.transactionType === "Deposit");
    const isWithdrawal = (t.transactionType === 2 || t.transactionType === "Withdrawal");
    const isTransfer = (t.transactionType === 0 || t.transactionType === "Transfer");

    const isIncoming = isDeposit || (isTransfer && myAccountIds.has(t.toAccountId) && !myAccountIds.has(t.fromAccountId));
    const isInternal = isTransfer && myAccountIds.has(t.toAccountId) && myAccountIds.has(t.fromAccountId);
    
    let iconClass = "deposit";
    let iconBi = "bi-arrow-down-left";
    let typeName = "Mədaxil";
    let sign = "+";
    let amountClass = "positive";

    if (isDeposit) {
        iconClass = "deposit";
        iconBi = "bi-arrow-down-left";
        typeName = "Mədaxil";
        sign = "+";
        amountClass = "positive";
    } else if (isWithdrawal) {
        iconClass = "withdraw";
        iconBi = "bi-arrow-up-right";
        typeName = "Məxaric";
        sign = "-";
        amountClass = "negative";
    } else if (isTransfer) {
        if (isInternal) {
            iconClass = "transfer";
            iconBi = "bi-arrow-left-right";
            typeName = "Daxili Köçürmə";
            sign = "↔";
            amountClass = "text-info";
        } else if (isIncoming) {
            iconClass = "deposit";
            iconBi = "bi-arrow-down-left";
            typeName = "Mədaxil";
            sign = "+";
            amountClass = "positive";
        } else {
            iconClass = "transfer";
            iconBi = "bi-arrow-up-right";
            typeName = "Pul Köçürməsi";
            sign = "-";
            amountClass = "negative";
        }
    }

    let titleText = t.description;
    if (!titleText) {
        if (isDeposit) titleText = "Balans artırıldı (Deposit)";
        else if (isWithdrawal) titleText = "Hesabdan məxaric";
        else if (isTransfer) {
            if (isInternal) titleText = "Hesablar arası daxili köçürmə";
            else if (isIncoming) titleText = t.fromAccountNumber ? `Köçürmə: *${t.fromAccountNumber.slice(-4)} hesabından` : "Daxil olan köçürmə";
            else titleText = t.toAccountNumber ? `Köçürmə: *${t.toAccountNumber.slice(-4)} hesabına` : "Pul köçürməsi";
        } else {
            titleText = typeName;
        }
    }

    const dateFormatted = formatDate(t.createdAt);
    const amountVal = `${sign} ${formatMoney(t.amount)} ₼`;

    // Account Method / Name
    let methodText = "Cari Hesab";
    if (t.fromAccountId && !isIncoming) {
        methodText = t.fromAccountNumber ? `Hesab *${t.fromAccountNumber.slice(-4)}` : `Hesab #${t.fromAccountId}`;
    } else if (t.toAccountId) {
        methodText = t.toAccountNumber ? `Hesab *${t.toAccountNumber.slice(-4)}` : `Hesab #${t.toAccountId}`;
    }

    tr.innerHTML = `
        <td>
            <div class="tx-name-cell">
                <div class="tx-icon-circle ${iconClass}">
                    <i class="bi ${iconBi}"></i>
                </div>
                <div>
                    <div class="tx-title">${escapeHtml(titleText)}</div>
                    <div class="tx-subtitle">${typeName}</div>
                </div>
            </div>
        </td>
        <td class="text-muted small">
            ${dateFormatted}
        </td>
        <td>
            <span class="tx-amount ${amountClass}">${amountVal}</span>
        </td>
        <td>
            <span class="tx-status-pill completed">
                <span class="dot"></span> Tamamlandı
            </span>
        </td>
        <td>
            <span class="tx-method-pill">
                <i class="bi bi-credit-card-2-front"></i> ${methodText}
            </span>
        </td>
    `;
    return tr;
}

function filterTransactions(e) {
    const term = e.target.value.toLowerCase().trim();
    const tbody = document.getElementById("recentTransactionsTableBody");
    if (!tbody) return;

    if (!term) {
        renderTransactionsTable(allTransactions);
        return;
    }

    const filtered = allTransactions.filter(t => {
        const desc = (t.description || "").toLowerCase();
        const amt = String(t.amount || "");
        const id = String(t.id || "");
        return desc.includes(term) || amt.includes(term) || id.includes(term);
    });

    tbody.innerHTML = "";
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-muted">
                    "<strong>${escapeHtml(term)}</strong>" üzrə heç bir əməliyyat tapılmadı.
                </td>
            </tr>
        `;
        return;
    }

    filtered.slice(0, 10).forEach(t => {
        tbody.appendChild(createTransactionRow(t));
    });
}

// --- Pul Axını (Cash Flow) Chart.js ---
function renderCashFlowChart(transactions) {
    const ctx = document.getElementById("cashFlowChart");
    if (!ctx) return;

    if (cashFlowChartInstance) {
        cashFlowChartInstance.destroy();
    }

    // Prepare dynamic month-by-month or transaction buckets
    const monthNames = ["Yan", "Fev", "Mar", "Apr", "May", "İyn", "İyl", "Avq", "Sen", "Okt", "Noy", "Dek"];
    const currentMonth = new Date().getMonth();

    // Generate last 6 months labels
    const labels = [];
    const incomeData = [0, 0, 0, 0, 0, 0];
    const expenseData = [0, 0, 0, 0, 0, 0];

    for (let i = 5; i >= 0; i--) {
        let m = currentMonth - i;
        if (m < 0) m += 12;
        labels.push(monthNames[m]);
    }

    // Populate with real transaction totals
    if (transactions && transactions.length > 0) {
        const now = new Date();
        transactions.forEach(t => {
            const txDate = new Date(t.createdAt);
            const monthDiff = (now.getFullYear() - txDate.getFullYear()) * 12 + (now.getMonth() - txDate.getMonth());
            if (monthDiff >= 0 && monthDiff < 6) {
                const bucketIdx = 5 - monthDiff;
                const amt = Number(t.amount) || 0;
                const myAccountIds = new Set(userAccounts.map(a => a.id));
                const isDeposit = (t.transactionType === 1 || t.transactionType === "Deposit");
                const isIncoming = isDeposit || ((t.transactionType === 0 || t.transactionType === "Transfer") && myAccountIds.has(t.toAccountId) && !myAccountIds.has(t.fromAccountId));
                if (isIncoming) {
                    incomeData[bucketIdx] += amt;
                } else {
                    expenseData[bucketIdx] += amt;
                }
            }
        });
    }

    // Chart.js gradient setup
    const chartContext = ctx.getContext('2d');
    const incomeGradient = chartContext.createLinearGradient(0, 0, 0, 250);
    incomeGradient.addColorStop(0, 'rgba(5, 150, 105, 0.22)');
    incomeGradient.addColorStop(1, 'rgba(5, 150, 105, 0.00)');

    const expenseGradient = chartContext.createLinearGradient(0, 0, 0, 250);
    expenseGradient.addColorStop(0, 'rgba(2, 132, 199, 0.18)');
    expenseGradient.addColorStop(1, 'rgba(2, 132, 199, 0.00)');

    cashFlowChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Mədaxil (Gəlir)',
                    data: incomeData,
                    borderColor: '#059669',
                    backgroundColor: incomeGradient,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2.5,
                    pointBackgroundColor: '#059669',
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Məxaric (Xərc)',
                    data: expenseData,
                    borderColor: '#0284c7',
                    backgroundColor: expenseGradient,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointBackgroundColor: '#0284c7',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false // Using custom HTML legend in header
                },
                tooltip: {
                    backgroundColor: '#ffffff',
                    titleColor: '#0f172a',
                    bodyColor: '#64748b',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: function (ctx) {
                            return `${ctx.dataset.label}: ${formatMoney(ctx.raw)} ₼`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: '#f1f5f9'
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Plus Jakarta Sans', size: 11 }
                    }
                },
                y: {
                    grid: {
                        color: '#f1f5f9'
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'JetBrains Mono', size: 11 },
                        callback: function (value) {
                            return `${value} ₼`;
                        }
                    },
                    beginAtZero: true
                }
            }
        }
    });
}

// --- Deposit & Create Account Form Wiring ---
function populateDepositAccountSelect(accounts) {
    const select = document.getElementById("depositAccountSelect");
    if (!select) return;

    select.innerHTML = '<option value="" disabled selected>Hesab seçin...</option>';
    if (!accounts || accounts.length === 0) return;

    accounts.forEach(acc => {
        const typeName = acc.accountType === 0 ? "Əmanət" : "Cari";
        const num = acc.accountNumber ? acc.accountNumber.slice(-4) : acc.id;
        const opt = document.createElement("option");
        opt.value = acc.id;
        opt.textContent = `${typeName} Hesab (*${num}) — Qalıq: ${formatMoney(acc.balance)} ₼`;
        select.appendChild(opt);
    });
}

function setupDepositForm(token) {
    const form = document.getElementById("depositForm");
    const alertBox = document.getElementById("depositAlert");
    const submitBtn = document.getElementById("depositSubmitBtn");

    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const accountId = document.getElementById("depositAccountSelect").value;
        const amount = parseFloat(document.getElementById("depositAmount").value);
        const description = document.getElementById("depositDescription").value.trim();

        if (!accountId || isNaN(amount) || amount <= 0) {
            showAlert(alertBox, "Zəhmət olmasa düzgün hesab və məbləğ seçin.", "danger");
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
                    accountId: parseInt(accountId),
                    amount: amount,
                    description: description || "Balans Artırma (Mədaxil)"
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Mədaxil əməliyyatı baş tutmadı.");
            }

            showAlert(alertBox, `Uğurlu! ${formatMoney(amount)} ₼ hesaba mədaxil edildi.`, "success");
            form.reset();

            // Refresh dashboard data
            setTimeout(async () => {
                const modalEl = document.getElementById("depositModal");
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                alertBox.classList.add("d-none");
                await loadDashboardData(token);
            }, 1200);

        } catch (err) {
            showAlert(alertBox, err.message, "danger");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check2-circle"></i> Təsdiq et';
        }
    });
}

function setupCreateAccountForm(token) {
    const form = document.getElementById("createAccountForm");
    const alertBox = document.getElementById("createAccountAlert");
    const submitBtn = document.getElementById("createAccountSubmitBtn");

    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        const accountType = parseInt(document.getElementById("newAccountType").value);
        const initialBalance = parseFloat(document.getElementById("newAccountInitialBalance").value) || 0;

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
                throw new Error(errData.message || "Yeni hesab açıla bilmədi.");
            }

            showAlert(alertBox, "Yeni bank hesabı uğurla yaradıldı!", "success");
            form.reset();

            setTimeout(async () => {
                const modalEl = document.getElementById("createAccountModal");
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                alertBox.classList.add("d-none");
                await loadDashboardData(token);
            }, 1200);

        } catch (err) {
            showAlert(alertBox, err.message, "danger");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-plus-lg"></i> Hesab Aç';
        }
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
        // Silently handle notification errors
    }
}

// --- Helpers ---
function showAlert(box, msg, type) {
    if (!box) return;
    box.className = `alert alert-${type} mt-3`;
    box.textContent = msg;
    box.classList.remove("d-none");
}

function formatDate(isoString) {
    if (!isoString) return "-";
    const d = typeof parseUtcDate === "function" ? parseUtcDate(isoString) : new Date(isoString);
    if (!d || isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hour}:${min}`;
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
