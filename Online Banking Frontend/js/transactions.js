// ==========================================================================
// ONLINEBANK — TRANSACTIONS & STATEMENT CONTROLLER (transactions.js)
// F4: Full Transaction Ledger with Balance Snapshots
// F5: Account Statement Generation for Date Range & Official A4 PDF Print
// ==========================================================================

let userAccounts = [];
let allTransactions = [];
let filteredTransactions = [];

// Filter state
let filterType = 'all';
let filterSearch = '';
let filterDateFrom = '';
let filterDateTo = '';
let filterAccount = 'all';
let filterStatus = 'all';
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

    // 4. Setup Filters (Pills, Search, Date Range, Status)
    setupFilterEvents(token);

    // 5. Setup Statement Modal & Generator (F5)
    setupStatementGenerator(token);

    // 6. Load Dynamic Accounts & Transactions
    await loadData(token);

    // 7. Check unread notifications
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
    const stmtClient = document.getElementById("stmtClientName");

    if (nameEl) nameEl.textContent = fullName;
    if (roleEl) roleEl.textContent = isAdmin ? "Administrator" : "Müştəri";
    if (avatarEl) avatarEl.textContent = avatarLetter;
    if (stmtClient) stmtClient.textContent = fullName;

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

// --- Load Dynamic Accounts & Transactions ---
async function loadData(token) {
    try {
        // Step A: Load Accounts
        const accRes = await fetch(`${API_BASE_URL}/account`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!accRes.ok) {
            if (accRes.status === 401) {
                clearAuth();
                window.location.href = "index.html";
                return;
            }
            throw new Error("Hesablar alına bilmədi.");
        }

        userAccounts = await accRes.json();
        populateAccountSelects(userAccounts);

        // Step B: Load All Transactions
        allTransactions = [];
        if (userAccounts && userAccounts.length > 0) {
            const txPromises = userAccounts.map(acc => 
                fetch(`${API_BASE_URL}/transaction/account/${acc.id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                })
                .then(r => r.ok ? r.json() : [])
                .catch(() => [])
            );

            const results = await Promise.all(txPromises);
            const seenIds = new Set();
            results.flat().forEach(t => {
                if (t && t.id && !seenIds.has(t.id)) {
                    seenIds.add(t.id);
                    allTransactions.push(t);
                }
            });

            // Sort newest first
            allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        // Apply filters & render
        applyFilters();

    } catch (err) {
        console.error("Tranzaksiya yükləmə xətası:", err);
    }
}

function populateAccountSelects(accounts) {
    const filterSelect = document.getElementById("txAccountFilter");
    const stmtSelect = document.getElementById("stmtAccountSelect");

    if (filterSelect) {
        filterSelect.innerHTML = '<option value="all">Bütün Hesablar ▼</option>';
    }
    if (stmtSelect) {
        stmtSelect.innerHTML = '';
    }

    if (!accounts || accounts.length === 0) return;

    accounts.forEach(acc => {
        const typeName = acc.accountType === 0 ? "Əmanət" : "Cari";
        const num = acc.accountNumber ? acc.accountNumber.slice(-4) : acc.id;
        const text = `${typeName} Hesab (*${num}) — ₼ ${formatMoney(acc.balance)}`;

        if (filterSelect) {
            const opt1 = document.createElement("option");
            opt1.value = acc.id;
            opt1.textContent = text;
            filterSelect.appendChild(opt1);
        }

        if (stmtSelect) {
            const opt2 = document.createElement("option");
            opt2.value = acc.id;
            opt2.textContent = text;
            opt2.dataset.accountNumber = acc.accountNumber;
            opt2.dataset.accountType = typeName;
            opt2.dataset.balance = acc.balance;
            stmtSelect.appendChild(opt2);
        }
    });
}

// --- Setup Filter Controls ---
function setupFilterEvents(token) {
    // 1. Filter Pills: [All] [Income] [Expense] [Transfer] [Payment]
    const pills = document.querySelectorAll(".tx-filter-pill");
    pills.forEach(p => {
        p.addEventListener("click", function () {
            pills.forEach(x => x.classList.remove("active"));
            this.classList.add("active");
            filterType = this.dataset.type;
            applyFilters();
        });
    });

    // 2. Search Input
    const searchInput = document.getElementById("txSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", function (e) {
            filterSearch = e.target.value.toLowerCase().trim();
            applyFilters();
        });
    }

    // 3. Date Range Button
    const btnDate = document.getElementById("btnApplyDateFilter");
    if (btnDate) {
        btnDate.addEventListener("click", function () {
            filterDateFrom = document.getElementById("txDateFrom").value;
            filterDateTo = document.getElementById("txDateTo").value;
            applyFilters();
        });
    }

    // 4. Account & Status Dropdowns
    const accSelect = document.getElementById("txAccountFilter");
    const statusSelect = document.getElementById("txStatusFilter");

    if (accSelect) {
        accSelect.addEventListener("change", function () {
            filterAccount = this.value;
            applyFilters();
        });
    }

    if (statusSelect) {
        statusSelect.addEventListener("change", function () {
            filterStatus = this.value;
            applyFilters();
        });
    }

    // 5. Reset Button
    const btnReset = document.getElementById("btnResetFilters");
    if (btnReset) {
        btnReset.addEventListener("click", function () {
            filterType = 'all';
            filterSearch = '';
            filterDateFrom = '';
            filterDateTo = '';
            filterAccount = 'all';
            filterStatus = 'all';

            pills.forEach(p => p.classList.remove("active"));
            document.querySelector('.tx-filter-pill[data-type="all"]')?.classList.add("active");

            if (searchInput) searchInput.value = '';
            const df = document.getElementById("txDateFrom");
            const dt = document.getElementById("txDateTo");
            if (df) df.value = '';
            if (dt) dt.value = '';
            if (accSelect) accSelect.value = 'all';
            if (statusSelect) statusSelect.value = 'all';

            applyFilters();
        });
    }
}

// --- Transaction Classification Helper (Accurately parses C# Enum & Inflow/Outflow) ---
function getTxClassification(t, selectedAccountId = null) {
    const myAccountIds = new Set(userAccounts.map(a => a.id));
    const isDeposit = (t.transactionType === 1 || t.transactionType === "Deposit");
    const isWithdrawal = (t.transactionType === 2 || t.transactionType === "Withdrawal");
    const isTransfer = (t.transactionType === 0 || t.transactionType === "Transfer");

    let isIncoming = false;
    let isOutgoing = false;
    let isInternal = false;

    if (selectedAccountId) {
        const accId = parseInt(selectedAccountId);
        isIncoming = (t.toAccountId === accId);
        isOutgoing = (t.fromAccountId === accId);
    } else {
        const fromMine = myAccountIds.has(t.fromAccountId);
        const toMine = myAccountIds.has(t.toAccountId);

        if (fromMine && toMine) {
            isInternal = true;
        } else if (toMine) {
            isIncoming = true;
        } else if (fromMine) {
            isOutgoing = true;
        } else {
            if (isDeposit) isIncoming = true;
            else if (isWithdrawal) isOutgoing = true;
        }
    }

    let typeCategory = isDeposit ? "income" : (isWithdrawal ? "expense" : "transfer");
    let typeLabel = "Əməliyyat";
    let typeBadgeClass = "bg-secondary-subtle text-secondary";
    let sign = "";
    let amountClass = "neutral";
    let iconClass = "deposit";
    let iconBi = "bi-arrow-down-left";
    let description = t.description || "";
    let balanceSnapshot = "-";

    if (isDeposit) {
        typeCategory = "income";
        typeLabel = "Mədaxil";
        typeBadgeClass = "bg-success-subtle text-success";
        sign = "+";
        amountClass = "positive";
        iconClass = "deposit";
        iconBi = "bi-arrow-down-left";
        if (!description) description = "Balans artırıldı (Deposit)";
        if (t.toBalanceSnapshot != null) balanceSnapshot = `${formatMoney(t.toBalanceSnapshot)} ₼`;
    } else if (isWithdrawal) {
        typeCategory = "expense";
        typeLabel = "Məxaric";
        typeBadgeClass = "bg-danger-subtle text-danger";
        sign = "-";
        amountClass = "negative";
        iconClass = "withdraw";
        iconBi = "bi-arrow-up-right";
        if (!description) description = "Hesabdan məxaric / Nağdlaşdırma";
        if (t.fromBalanceSnapshot != null) balanceSnapshot = `${formatMoney(t.fromBalanceSnapshot)} ₼`;
    } else if (isTransfer) {
        if (isInternal && !selectedAccountId) {
            typeCategory = "transfer";
            typeLabel = "Daxili Köçürmə";
            typeBadgeClass = "bg-info-subtle text-info";
            sign = "↔";
            amountClass = "text-info";
            iconClass = "transfer";
            iconBi = "bi-arrow-left-right";
            if (!description) {
                const fromNum = t.fromAccountNumber ? `*${t.fromAccountNumber.slice(-4)}` : `#${t.fromAccountId}`;
                const toNum = t.toAccountNumber ? `*${t.toAccountNumber.slice(-4)}` : `#${t.toAccountId}`;
                description = `Hesablar arası köçürmə (${fromNum} → ${toNum})`;
            }
            balanceSnapshot = t.toBalanceSnapshot != null ? `${formatMoney(t.toBalanceSnapshot)} ₼` : "-";
        } else if (isIncoming) {
            typeCategory = "income";
            typeLabel = "Mədaxil";
            typeBadgeClass = "bg-success-subtle text-success";
            sign = "+";
            amountClass = "positive";
            iconClass = "deposit";
            iconBi = "bi-arrow-down-left";
            if (!description) {
                description = t.fromAccountNumber ? `Köçürmə: *${t.fromAccountNumber.slice(-4)} hesabından` : "Daxil olan köçürmə";
            }
            if (t.toBalanceSnapshot != null) balanceSnapshot = `${formatMoney(t.toBalanceSnapshot)} ₼`;
        } else {
            typeCategory = "expense";
            typeLabel = "Köçürmə";
            typeBadgeClass = "bg-warning-subtle text-warning";
            sign = "-";
            amountClass = "negative";
            iconClass = "transfer";
            iconBi = "bi-arrow-up-right";
            if (!description) {
                description = t.toAccountNumber ? `Köçürmə: *${t.toAccountNumber.slice(-4)} hesabına` : "Hesabdan köçürmə";
            }
            if (t.fromBalanceSnapshot != null) balanceSnapshot = `${formatMoney(t.fromBalanceSnapshot)} ₼`;
        }
    }

    return {
        isIncoming,
        isOutgoing,
        isInternal,
        typeCategory,
        typeLabel,
        typeBadgeClass,
        sign,
        amountClass,
        iconClass,
        iconBi,
        description,
        balanceSnapshot
    };
}

// --- Filter Core Logic & Render ---
function applyFilters() {
    filteredTransactions = allTransactions.filter(t => {
        const meta = getTxClassification(t, filterAccount !== 'all' ? filterAccount : null);

        // A. Type Filter
        if (filterType === 'income' && meta.typeCategory !== 'income' && !meta.isIncoming) return false;
        if (filterType === 'expense' && meta.typeCategory !== 'expense' && !meta.isOutgoing) return false;
        if (filterType === 'transfer' && t.transactionType !== 0 && t.transactionType !== "Transfer") return false;
        if (filterType === 'payment' && !meta.isOutgoing) return false;

        // B. Account Filter
        if (filterAccount !== 'all') {
            const accId = parseInt(filterAccount);
            if (t.fromAccountId !== accId && t.toAccountId !== accId) {
                return false;
            }
        }

        // C. Date Range Filter
        if (filterDateFrom) {
            const dFrom = new Date(filterDateFrom + "T00:00:00");
            if (new Date(t.createdAt) < dFrom) return false;
        }
        if (filterDateTo) {
            const dTo = new Date(filterDateTo + "T23:59:59.999");
            if (new Date(t.createdAt) > dTo) return false;
        }

        // D. Search Term
        if (filterSearch) {
            const desc = (meta.description || "").toLowerCase();
            const amt = String(t.amount || "");
            const id = String(t.id || "");
            const fromAcc = String(t.fromAccountNumber || "").toLowerCase();
            const toAcc = String(t.toAccountNumber || "").toLowerCase();
            if (!desc.includes(filterSearch) && !amt.includes(filterSearch) && !id.includes(filterSearch) && !fromAcc.includes(filterSearch) && !toAcc.includes(filterSearch)) {
                return false;
            }
        }

        return true;
    });

    // Update Summary Metrics
    updateMetrics(filteredTransactions);

    // Render Table Rows
    renderTable(filteredTransactions);

    // Active Filter Badge
    const badge = document.getElementById("txFilterActiveBadge");
    const isFiltered = (filterType !== 'all' || filterSearch || filterDateFrom || filterDateTo || filterAccount !== 'all' || filterStatus !== 'all');
    if (badge) {
        badge.style.display = isFiltered ? "inline-block" : "none";
    }
}

function updateMetrics(transactions) {
    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
        const meta = getTxClassification(t, filterAccount !== 'all' ? filterAccount : null);
        const amt = Number(t.amount) || 0;
        if (meta.isIncoming || meta.typeCategory === "income") {
            income += amt;
        } else if (meta.isOutgoing || meta.typeCategory === "expense") {
            expense += amt;
        }
    });

    const net = income - expense;

    const incEl = document.getElementById("metricTotalIncome");
    const expEl = document.getElementById("metricTotalExpense");
    const netEl = document.getElementById("metricNetCashFlow");
    const countEl = document.getElementById("metricTxCount");

    if (incEl) incEl.textContent = `+ ${formatMoney(income)} ₼`;
    if (expEl) expEl.textContent = `- ${formatMoney(expense)} ₼`;
    if (netEl) {
        netEl.textContent = `${net >= 0 ? '+' : ''}${formatMoney(net)} ₼`;
        netEl.className = `tx-metric-val ${net >= 0 ? 'text-success' : 'text-danger'}`;
    }
    if (countEl) countEl.textContent = transactions.length;

    const counter = document.getElementById("txCounterText");
    if (counter) counter.textContent = `Göstərilir: ${transactions.length} əməliyyat`;
}

function renderTable(transactions) {
    const tbody = document.getElementById("transactionsTableBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-2 d-block mb-2 text-muted"></i>
                    <span>Axtarışınıza uyğun heç bir əməliyyat tapılmadı.</span>
                </td>
            </tr>
        `;
        return;
    }

    transactions.forEach(t => {
        const tr = document.createElement("tr");
        const meta = getTxClassification(t, filterAccount !== 'all' ? filterAccount : null);

        const dateStr = formatDateShort(t.createdAt);
        const amountStr = `${meta.sign} ${formatMoney(t.amount)} ₼`;

        tr.innerHTML = `
            <td>
                <div class="fw-bold text-dark small">${dateStr}</div>
                <div class="text-muted" style="font-size: 0.72rem;">${formatTime(t.createdAt)}</div>
            </td>
            <td>
                <div class="tx-name-cell">
                    <div class="tx-icon-circle ${meta.iconClass}" style="width: 32px; height: 32px; font-size: 0.85rem;">
                        <i class="bi ${meta.iconBi}"></i>
                    </div>
                    <div>
                        <div class="tx-title small">${escapeHtml(meta.description)}</div>
                        <div class="tx-subtitle" style="font-size: 0.72rem;">ID: #${t.id}</div>
                    </div>
                </div>
            </td>
            <td>
                <span class="badge ${meta.typeBadgeClass} px-2 py-1" style="font-size: 0.75rem;">${meta.typeLabel}</span>
            </td>
            <td>
                <span class="tx-amount ${meta.amountClass} fs-6">${amountStr}</span>
            </td>
            <td>
                <span class="font-monospace text-muted small">${meta.balanceSnapshot}</span>
            </td>
            <td>
                <span class="tx-status-pill completed">
                    <i class="bi bi-check-lg me-1"></i> Tamamlandı
                </span>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// --- Official Statement Generator (F5) ---
function setupStatementGenerator(token) {
    const btnOpen = document.getElementById("btnOpenExportModal");
    const modalEl = document.getElementById("statementModal");
    const modal = modalEl ? new bootstrap.Modal(modalEl) : null;
    const generateBtn = document.getElementById("stmtGenerateBtn");
    const accSelect = document.getElementById("stmtAccountSelect");

    const dateFromInput = document.getElementById("stmtDateFrom");
    const dateToInput = document.getElementById("stmtDateTo");

    const formatDateInput = (d) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    
    if (dateFromInput && !dateFromInput.value) dateFromInput.value = formatDateInput(firstDay);
    if (dateToInput && !dateToInput.value) dateToInput.value = formatDateInput(now);

    if (btnOpen && modal) {
        btnOpen.addEventListener("click", function () {
            modal.show();
            generateStatement(token);
        });
    }

    if (generateBtn) {
        generateBtn.addEventListener("click", function () {
            generateStatement(token);
        });
    }

    if (accSelect) {
        accSelect.addEventListener("change", function () {
            generateStatement(token);
        });
    }
}

async function generateStatement(token) {
    const select = document.getElementById("stmtAccountSelect");
    const fromInput = document.getElementById("stmtDateFrom");
    const toInput = document.getElementById("stmtDateTo");
    const tbody = document.getElementById("stmtTableBody");

    const accountId = select ? select.value : null;
    const fromDate = fromInput ? fromInput.value : null;
    const toDate = toInput ? toInput.value : null;

    if (!accountId) {
        alert("Zəhmət olmasa çıxarış üçün hesab seçin.");
        return;
    }

    // Set Header Metadata
    const selectedOption = select.options[select.selectedIndex];
    const accNumber = selectedOption?.dataset.accountNumber || `ACC-${accountId}`;
    const accType = selectedOption?.dataset.accountType || "Cari";
    const currentBal = parseFloat(selectedOption?.dataset.balance) || 0;

    const fullName = getAuthFullName() || "Hörmətli Müştəri";
    const clientNameEl = document.getElementById("stmtClientName");
    if (clientNameEl) clientNameEl.textContent = fullName;

    const docNumEl = document.getElementById("stmtDocNumber");
    if (docNumEl) docNumEl.textContent = `OB-${new Date().getFullYear()}/${String(accountId).padStart(4, '0')}`;

    const printDateEl = document.getElementById("stmtPrintDate");
    if (printDateEl) printDateEl.textContent = formatDateShort(new Date().toISOString());

    const accTypeEl = document.getElementById("stmtAccountType");
    if (accTypeEl) accTypeEl.textContent = `${accType} Hesab`;

    const accNumEl = document.getElementById("stmtAccountNumber");
    if (accNumEl) accNumEl.textContent = accNumber;

    const periodEl = document.getElementById("stmtPeriodDisplay");
    if (periodEl) {
        periodEl.textContent = `${formatDateShort(fromDate)} — ${formatDateShort(toDate)}`;
    }

    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-muted">Çıxarış formalaşdırılır...</td></tr>`;

    try {
        let stmts = [];
        const accId = parseInt(accountId);

        // Fetch from Official Statement API endpoint
        let url = `${API_BASE_URL}/transaction/account/${accountId}/statement`;
        if (fromDate && toDate) {
            url += `?from=${fromDate}T00:00:00Z&to=${toDate}T23:59:59Z`;
        }

        try {
            const res = await fetch(url, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                stmts = await res.json();
            }
        } catch (_) {}

        // Fallback or validation
        if (!stmts || stmts.length === 0) {
            stmts = allTransactions.filter(t => {
                if (t.fromAccountId !== accId && t.toAccountId !== accId) return false;
                const d = new Date(t.createdAt);
                if (fromDate && d < new Date(fromDate + 'T00:00:00')) return false;
                if (toDate && d > new Date(toDate + 'T23:59:59.999')) return false;
                return true;
            });
        }

        // Sort ascending for chronological statement ledger flow (earliest first)
        stmts.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        tbody.innerHTML = "";

        if (stmts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Bu dövr üzrə heç bir əməliyyat qeydə alınmayıb.</td></tr>`;
            document.getElementById("stmtInitialBalance").textContent = `${formatMoney(currentBal)} ₼`;
            document.getElementById("stmtSumIncome").textContent = "0.00 ₼";
            document.getElementById("stmtSumExpense").textContent = "0.00 ₼";
            document.getElementById("stmtFinalBalance").textContent = `${formatMoney(currentBal)} ₼`;
            return;
        }

        let sumIncome = 0;
        let sumExpense = 0;

        stmts.forEach((t, index) => {
            const meta = getTxClassification(t, accountId);
            const amt = Number(t.amount) || 0;

            const isInflow = meta.isIncoming;
            if (isInflow) {
                sumIncome += amt;
            } else {
                sumExpense += amt;
            }

            const snapshotNum = isInflow ? (t.toBalanceSnapshot ?? 0) : (t.fromBalanceSnapshot ?? 0);
            const snapshotFormatted = `${formatMoney(snapshotNum)} ₼`;
            const amtFormatted = `${meta.sign} ${formatMoney(amt)} ₼`;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="font-monospace">${index + 1}</td>
                <td>${formatDate(t.createdAt)}</td>
                <td class="fw-bold">${escapeHtml(meta.description)}</td>
                <td><span class="badge ${isInflow ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} px-2 py-1">${meta.typeLabel}</span></td>
                <td class="text-end fw-bold font-monospace ${isInflow ? 'text-success' : 'text-danger'}">${amtFormatted}</td>
                <td class="text-end font-monospace fw-bold">${snapshotFormatted}</td>
            `;
            tbody.appendChild(tr);
        });

        // Exact Initial & Final Balance Calculations
        const firstTx = stmts[0];
        const firstIsInflow = (firstTx.toAccountId === accId);
        const firstAmt = Number(firstTx.amount) || 0;
        let initialBalance = 0;

        if (firstIsInflow) {
            const firstSnap = Number(firstTx.toBalanceSnapshot) || 0;
            initialBalance = firstSnap - firstAmt;
        } else {
            const firstSnap = Number(firstTx.fromBalanceSnapshot) || 0;
            initialBalance = firstSnap + firstAmt;
        }
        if (initialBalance < 0) initialBalance = 0;

        const finalBalance = initialBalance + sumIncome - sumExpense;

        document.getElementById("stmtInitialBalance").textContent = `${formatMoney(initialBalance)} ₼`;
        document.getElementById("stmtSumIncome").textContent = `+ ${formatMoney(sumIncome)} ₼`;
        document.getElementById("stmtSumExpense").textContent = `- ${formatMoney(sumExpense)} ₼`;
        document.getElementById("stmtFinalBalance").textContent = `${formatMoney(finalBalance)} ₼`;

    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-danger">Çıxarış yüklənərkən xəta baş verdi: ${e.message}</td></tr>`;
    }
}

// Global print trigger function for Statement Modal
window.printOfficialStatement = function () {
    window.print();
};

// --- Toggle Balance Visibility Eye ---
function toggleBalanceVisibility() {
    isBalanceHidden = !isBalanceHidden;
    const icon = document.getElementById("toggleEyeIcon");
    if (icon) {
        icon.className = isBalanceHidden ? "bi bi-eye-slash" : "bi bi-eye";
    }
    applyFilters();
}

// --- Helper Functions ---
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
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hour}:${min}`;
}

function formatDateShort(iso) {
    if (!iso) return "-";
    if (typeof iso === "string" && iso.length === 10 && iso.includes("-")) {
        iso = iso + "T00:00:00";
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "-";
    const months = ["Yan", "Fev", "Mar", "Apr", "May", "İyn", "İyl", "Avq", "Sen", "Okt", "Noy", "Dek"];
    const day = String(d.getDate()).padStart(2, '0');
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTime(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${hour}:${min}`;
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
