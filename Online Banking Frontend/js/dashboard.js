document.addEventListener("DOMContentLoaded", async function () {
    const token = sessionStorage.getItem("token");

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    let fullNameVal = sessionStorage.getItem("fullName");
    if (fullNameVal) {
        fullNameVal = fullNameVal.trim();
    }
    const fullName = fullNameVal || "İstifadəçi";
    const roles = JSON.parse(sessionStorage.getItem("roles") || "[]");

    const fullNameDisplay = document.getElementById("fullNameDisplay");
    const userGreeting = document.getElementById("userGreeting");
    const headerFullName = document.getElementById("headerFullName");
    const headerAvatar = document.getElementById("headerAvatar");
    
    if (fullNameDisplay) fullNameDisplay.textContent = fullName;
    if (headerFullName) headerFullName.textContent = fullName;
    
    const avatarLetter = fullName.charAt(0).toUpperCase();
    if (headerAvatar) headerAvatar.textContent = avatarLetter;
    
    if (userGreeting) {
        const hour = new Date().getHours();
        let greeting = "Salam";
        if (hour >= 6 && hour < 12) {
            greeting = "Sabahınız xeyir";
        } else if (hour >= 12 && hour < 18) {
            greeting = "Günortanız xeyir";
        } else if (hour >= 18 && hour < 24) {
            greeting = "Axşamınız xeyir";
        } else {
            greeting = "Gecəniz xeyir";
        }
        userGreeting.innerHTML = `${greeting}, <span id="fullNameDisplay">${fullName}</span>!`;
    }

    const sidebarName = document.getElementById("sidebarName");
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    const sidebarRole = document.getElementById("sidebarRole");
    if (sidebarName) sidebarName.textContent = fullName;
    if (sidebarAvatar) sidebarAvatar.textContent = avatarLetter;

    const topAvatar = document.getElementById("topAvatar");
    if (topAvatar) topAvatar.textContent = avatarLetter;

    if (sidebarRole) {
        sidebarRole.textContent = roles.includes("Admin") ? "Administrator" : "Müştəri";
    }

    const isAdmin = roles.includes("Admin");

    if (isAdmin) {
        const adminLinkWrapper = document.getElementById("adminLinkWrapper");
        if (adminLinkWrapper) adminLinkWrapper.style.display = "block";

        ["navAccounts", "navTransfer", "navTransactions", "navLoans", "navNotifications", "navBalanceAlert"]
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = "none";
            });
    }

    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", function () {
            sessionStorage.clear();
            window.location.href = "index.html";
        });
    }

    if (isAdmin) {
        const loadingState = document.getElementById("loadingState");
        const adminDashboardContent = document.getElementById("adminDashboardContent");
        const dashboardContent = document.getElementById("dashboardContent");

        if (dashboardContent) dashboardContent.classList.add("d-none");
        if (adminDashboardContent) adminDashboardContent.classList.remove("d-none");

        try {
            const [usersRes, accountsRes, loansRes] = await Promise.all([
                fetch(`${API_BASE_URL}/admin/users`, {
                    headers: { "Authorization": `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/admin/accounts`, {
                    headers: { "Authorization": `Bearer ${token}` }
                }),
                fetch(`${API_BASE_URL}/loanapplication/pending`, {
                    headers: { "Authorization": `Bearer ${token}` }
                })
            ]);

            if (usersRes.status === 401 || accountsRes.status === 401 || loansRes.status === 401) {
                sessionStorage.clear();
                window.location.href = "index.html";
                return;
            }

            if (!usersRes.ok || !accountsRes.ok || !loansRes.ok) {
                throw new Error("Admin məlumatlarını yükləmək mümkün olmadı.");
            }

            const users = await usersRes.json();
            const accounts = await accountsRes.json();
            const loans = await loansRes.json();

            // Populate Stats
            const adminTotalUsers = document.getElementById("adminTotalUsers");
            if (adminTotalUsers) adminTotalUsers.textContent = users.length;

            const adminTotalAccounts = document.getElementById("adminTotalAccounts");
            if (adminTotalAccounts) adminTotalAccounts.textContent = accounts.length;

            const adminPendingLoans = document.getElementById("adminPendingLoans");
            if (adminPendingLoans) adminPendingLoans.textContent = loans.length;

            const adminFrozenAccounts = document.getElementById("adminFrozenAccounts");
            if (adminFrozenAccounts) {
                const frozenCount = accounts.filter(a => a.status === 1 || a.status === "Frozen" || a.status === "Blocked").length;
                adminFrozenAccounts.textContent = frozenCount;
            }

        } catch (error) {
            console.error("Admin Dashboard yüklənərkən xəta:", error);
            const alertBox = document.getElementById("alertBox");
            if (alertBox) {
                alertBox.textContent = error.message;
                alertBox.classList.remove("d-none");
            }
        } finally {
            if (loadingState) loadingState.classList.add("d-none");
        }
        return;
    }

    const dashboardContent = document.getElementById("dashboardContent");
    if (dashboardContent) {
        await loadDashboardData(token);
    }
});

async function loadDashboardData(token) {
    const loadingState = document.getElementById("loadingState");
    const dashboardContent = document.getElementById("dashboardContent");

    const accountCardActive = document.getElementById("accountCardActive");
    const accountCardEmpty = document.getElementById("accountCardEmpty");
    const chartActive = document.getElementById("chartActive");
    const chartEmpty = document.getElementById("chartEmpty");
    const recentTransactionsList = document.getElementById("recentTransactionsList");
    const noTransactionsMsg = document.getElementById("noTransactionsMsg");

    try {
        const fullName = sessionStorage.getItem("fullName") || "İstifadəçi";
        const accountsRes = await fetch(`${API_BASE_URL}/account`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (accountsRes.status === 401) {
            sessionStorage.clear();
            window.location.href = "index.html";
            return;
        }

        const accounts = await accountsRes.json();

        // Hide loading and show dashboard content shell unconditionally
        if (loadingState) loadingState.classList.add("d-none");
        if (dashboardContent) dashboardContent.classList.remove("d-none");

        // 1. If user has no accounts
        if (!accounts || accounts.length === 0) {
            document.getElementById("totalBalance").textContent = "0.00";
            document.getElementById("statAccountCount").textContent = "0";
            document.getElementById("statTransactionCount").textContent = "0";
            
            const accountCountInfo = document.getElementById("accountCountInfo");
            if (accountCountInfo) accountCountInfo.textContent = "0 hesab";

            // Show empty states
            if (accountCardActive) accountCardActive.classList.add("d-none");
            if (accountCardEmpty) accountCardEmpty.classList.remove("d-none");
            if (chartActive) chartActive.classList.add("d-none");
            if (chartEmpty) chartEmpty.classList.remove("d-none");
            if (noTransactionsMsg) noTransactionsMsg.classList.remove("d-none");
            if (recentTransactionsList) recentTransactionsList.innerHTML = "";

            await loadUnreadNotificationsCount(token);
            return;
        }

        // 2. User has accounts
        if (accountCardEmpty) accountCardEmpty.classList.add("d-none");
        if (accountCardActive) accountCardActive.classList.remove("d-none");

        // Calculate and set balance and account counts
        const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
        document.getElementById("totalBalance").textContent = totalBalance.toFixed(2);
        
        const accountCountInfo = document.getElementById("accountCountInfo");
        if (accountCountInfo) accountCountInfo.textContent = `${accounts.length} hesab`;
        
        document.getElementById("statAccountCount").textContent = accounts.length;

        // Render first account on decorative virtual card
        const firstAcc = accounts[0];
        if (firstAcc) {
            const formatted = firstAcc.accountNumber.replace(/\s+/g, '');
            const firstAccNumber = document.getElementById("firstAccNumber");
            const firstAccBalance = document.getElementById("firstAccBalance");
            const firstAccType = document.getElementById("firstAccType");
            const cardHolderName = document.getElementById("cardHolderName");
            
            if (firstAccNumber) firstAccNumber.textContent = formatted;
            if (firstAccBalance) firstAccBalance.textContent = firstAcc.balance.toFixed(2);
            if (firstAccType) firstAccType.textContent = firstAcc.accountType === 0 ? "Əmanət" : "Cari";
            if (cardHolderName) cardHolderName.textContent = fullName.toUpperCase();
        }

        // Fetch transactions for all accounts to calculate stats and recent history
        let allTransactions = [];
        for (const acc of accounts) {
            try {
                const txRes = await fetch(`${API_BASE_URL}/transaction/account/${acc.id}`, {
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (txRes.ok) {
                    const txs = await txRes.json();
                    allTransactions = allTransactions.concat(
                        txs.map(t => ({ ...t, accountNumber: acc.accountNumber, ownAccountId: acc.id }))
                    );
                }
            } catch (e) {
                console.error("Tranzaksiya çəkilmə xətası:", e);
            }
        }

        allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        document.getElementById("statTransactionCount").textContent = allTransactions.length;

        // Render recent transactions
        renderRecentTransactions(allTransactions.slice(0, 5));

        // Render charts with Chart.js
        renderLineChart(allTransactions);
        renderDonutChart(allTransactions);

        // Get unread notifications
        await loadUnreadNotificationsCount(token);

    } catch (error) {
        if (loadingState) loadingState.classList.add("d-none");
        console.error("Dashboard yüklənərkən xəta:", error);
    }
}

async function loadUnreadNotificationsCount(token) {
    try {
        const notifRes = await fetch(`${API_BASE_URL}/notification/unread`, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (notifRes.ok) {
            const unread = await notifRes.json();
            const statUnreadCount = document.getElementById("statUnreadCount");
            if (statUnreadCount) statUnreadCount.textContent = unread.length;
        }
    } catch (e) {
        const statUnreadCount = document.getElementById("statUnreadCount");
        if (statUnreadCount) statUnreadCount.textContent = "0";
    }
}

function renderRecentTransactions(transactions) {
    const container = document.getElementById("recentTransactionsList");
    const emptyMsg = document.getElementById("noTransactionsMsg");

    if (!transactions || transactions.length === 0) {
        if (emptyMsg) emptyMsg.classList.remove("d-none");
        if (container) container.innerHTML = "";
        return;
    }

    if (emptyMsg) emptyMsg.classList.add("d-none");

    container.innerHTML = transactions.map(t => {
        const isOutgoing = t.fromAccountId === t.ownAccountId;
        const sign = isOutgoing ? "-" : "+";
        const colorClass = isOutgoing ? "text-danger" : "text-success";
        const icon = isOutgoing ? "💸" : "💰";
        const iconBg = isOutgoing ? "rgba(239, 68, 68, 0.08)" : "rgba(16, 185, 129, 0.08)";
        
        const date = new Date(t.createdAt).toLocaleDateString("az-AZ", {
            day: "2-digit", month: "2-digit", year: "numeric"
        });

        return `
            <div class="d-flex justify-content-between align-items-center py-2 border-bottom" style="margin-bottom: 2px;">
                <div class="d-flex align-items-center">
                    <div class="p-2 rounded-circle me-3 d-flex align-items-center justify-content-center" style="background-color: ${iconBg}; width: 38px; height: 38px; font-size: 1.1rem;">
                        ${icon}
                    </div>
                    <div>
                        <div class="fw-semibold text-dark" style="font-size: 0.88rem;">${t.accountNumber}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">${date}</div>
                    </div>
                </div>
                <div class="${colorClass} fw-bold" style="font-size: 0.95rem;">${sign}${t.amount.toFixed(2)} AZN</div>
            </div>
        `;
    }).join("");
}

function renderLineChart(allTransactions) {
    const chartActive = document.getElementById("chartActive");
    const chartEmpty = document.getElementById("chartEmpty");

    if (!allTransactions || allTransactions.length === 0) {
        if (chartActive) chartActive.classList.add("d-none");
        if (chartEmpty) chartEmpty.classList.remove("d-none");
        return;
    }

    // Generate last 6 months buckets
    const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
    const last6Months = [];
    
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        last6Months.push({
            monthIndex: d.getMonth(),
            year: d.getFullYear(),
            name: monthNames[d.getMonth()],
            income: 0,
            expense: 0
        });
    }

    // Aggregate transactions into buckets
    let hasActivity = false;
    allTransactions.forEach(t => {
        const txDate = new Date(t.createdAt);
        const txMonth = txDate.getMonth();
        const txYear = txDate.getFullYear();
        
        const bucket = last6Months.find(m => m.monthIndex === txMonth && m.year === txYear);
        if (bucket) {
            hasActivity = true;
            const isOutgoing = t.fromAccountId === t.ownAccountId;
            if (isOutgoing) {
                bucket.expense += t.amount;
            } else {
                bucket.income += t.amount;
            }
        }
    });

    if (!hasActivity) {
        if (chartActive) chartActive.classList.add("d-none");
        if (chartEmpty) chartEmpty.classList.remove("d-none");
        return;
    }

    if (chartEmpty) chartEmpty.classList.add("d-none");
    if (chartActive) chartActive.classList.remove("d-none");

    const ctx = document.getElementById('analyticsChart').getContext('2d');
    
    const existingChart = Chart.getChart("analyticsChart");
    if (existingChart) {
        existingChart.destroy();
    }

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: last6Months.map(m => m.name),
            datasets: [
                {
                    label: 'Gəlir',
                    data: last6Months.map(m => m.income),
                    borderColor: '#38bdf8', // Neon Blue
                    backgroundColor: 'rgba(56, 189, 248, 0.04)',
                    borderWidth: 3,
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#38bdf8',
                    pointHoverRadius: 6
                },
                {
                    label: 'Xərc',
                    data: last6Months.map(m => m.expense),
                    borderColor: '#ec4899', // Neon Pink
                    backgroundColor: 'rgba(236, 72, 153, 0.04)',
                    borderWidth: 3,
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#ec4899',
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        color: '#94a3b8',
                        font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' },
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    titleColor: '#ffffff',
                    bodyColor: '#cbd5e1',
                    padding: 10,
                    bodyFont: { family: 'Plus Jakarta Sans' },
                    titleFont: { family: 'Plus Jakarta Sans', weight: '700' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Plus Jakarta Sans', size: 10 },
                        callback: function(value) {
                            return value.toFixed(0) + ' ₼';
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { 
                        color: '#94a3b8',
                        font: { family: 'Plus Jakarta Sans', size: 10 } 
                    }
                }
            }
        }
    });
}

function renderDonutChart(allTransactions) {
    const canvas = document.getElementById("expenseBreakdownChart");
    if (!canvas) return;

    // Reset buckets
    let medaxilSum = 0;
    let mexaricSum = 0;
    let kocurmeSum = 0;

    allTransactions.forEach(t => {
        if (t.transactionType === 0) {
            // Transfer
            const isOutgoing = t.fromAccountId === t.ownAccountId;
            if (isOutgoing) {
                kocurmeSum += t.amount;
            } else {
                medaxilSum += t.amount;
            }
        } else if (t.transactionType === 1) {
            // Deposit (Mədaxil)
            medaxilSum += t.amount;
        } else if (t.transactionType === 2) {
            // Withdrawal (Məxaric)
            mexaricSum += t.amount;
        }
    });

    const total = medaxilSum + mexaricSum + kocurmeSum;
    if (total === 0) {
        // Fallback placeholder data if user has accounts but no transactions
        medaxilSum = 100;
        mexaricSum = 0;
        kocurmeSum = 0;
    }

    const ctx = canvas.getContext('2d');
    const existingDonut = Chart.getChart("expenseBreakdownChart");
    if (existingDonut) {
        existingDonut.destroy();
    }

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Mədaxil', 'Məxaric', 'Köçürmə'],
            datasets: [{
                data: [medaxilSum, mexaricSum, kocurmeSum],
                backgroundColor: [
                    '#10b981', // green for deposits
                    '#f43f5e', // pink/red for withdrawals
                    '#818cf8'  // purple for transfers
                ],
                borderWidth: 2,
                borderColor: '#0b0f17',
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        boxWidth: 10,
                        color: '#94a3b8',
                        font: { family: 'Plus Jakarta Sans', size: 10, weight: '600' },
                        padding: 10
                    }
                },
                tooltip: {
                    backgroundColor: '#0f172a',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    titleColor: '#ffffff',
                    bodyColor: '#cbd5e1',
                    padding: 8,
                    bodyFont: { family: 'Plus Jakarta Sans' },
                    callbacks: {
                        label: function(context) {
                            const val = context.raw || 0;
                            const pct = ((val / (total || 1)) * 100).toFixed(0);
                            return ` ${context.label}: ${val.toFixed(2)} ₼ (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

const conversionRates = {
    AZN: 1.0,
    USD: 1.7000,
    EUR: 1.8450,
    RUB: 0.0184
};

async function initCurrencyConverter() {
    const rateUsdBuy = document.getElementById("rateUsdBuy");
    const rateUsdSell = document.getElementById("rateUsdSell");
    const rateEurBuy = document.getElementById("rateEurBuy");
    const rateEurSell = document.getElementById("rateEurSell");
    const rateRubBuy = document.getElementById("rateRubBuy");
    const rateRubSell = document.getElementById("rateRubSell");

    const convertAmount = document.getElementById("convertAmount");
    const convertFrom = document.getElementById("convertFrom");
    const convertTo = document.getElementById("convertTo");
    const convertResult = document.getElementById("convertResult");

    if (!convertAmount || !convertFrom || !convertTo || !convertResult) return;

    // Fetch dynamic rates
    try {
        const res = await fetch("https://open.er-api.com/v6/latest/AZN");
        if (res.ok) {
            const data = await res.json();
            if (data && data.rates) {
                // Since base is AZN, rate is 1 AZN = X Currency.
                // 1 Currency = 1 / X AZN
                if (data.rates.USD) {
                    const usdReal = 1 / data.rates.USD;
                    conversionRates.USD = 1.7000; // USD pegged at 1.70
                }
                if (data.rates.EUR) {
                    const eurReal = 1 / data.rates.EUR;
                    conversionRates.EUR = parseFloat(eurReal.toFixed(4));
                    if (rateEurBuy) rateEurBuy.textContent = (eurReal - 0.0070).toFixed(4);
                    if (rateEurSell) rateEurSell.textContent = (eurReal + 0.0070).toFixed(4);
                }
                if (data.rates.RUB) {
                    const rubReal = 1 / data.rates.RUB;
                    conversionRates.RUB = parseFloat(rubReal.toFixed(4));
                    if (rateRubBuy) rateRubBuy.textContent = (rubReal - 0.0004).toFixed(4);
                    if (rateRubSell) rateRubSell.textContent = (rubReal + 0.0004).toFixed(4);
                }
            }
        }
    } catch (e) {
        console.warn("Valyuta API xətası, sabit məzənnələrdən istifadə olunur:", e);
    }

    function performConversion() {
        const amount = parseFloat(convertAmount.value) || 0;
        const from = convertFrom.value;
        const to = convertTo.value;

        if (amount <= 0) {
            convertResult.textContent = `0.00 ${to}`;
            return;
        }

        // Convert source currency to AZN, then to target currency
        const amountInAzn = amount * conversionRates[from];
        const result = amountInAzn / conversionRates[to];

        convertResult.textContent = `${amount.toFixed(2)} ${from} = ${result.toFixed(2)} ${to}`;
    }

    convertAmount.addEventListener("input", performConversion);
    convertFrom.addEventListener("change", performConversion);
    convertTo.addEventListener("change", performConversion);

    // Initial run
    performConversion();
}
