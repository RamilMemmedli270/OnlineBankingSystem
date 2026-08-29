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
    if (fullNameDisplay) fullNameDisplay.textContent = fullName;
    if (userGreeting) userGreeting.textContent = `Salam, ${fullName}`;

    // Dynamic sidebar profile details
    const sidebarName = document.getElementById("sidebarName");
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    const sidebarRole = document.getElementById("sidebarRole");
    if (sidebarName) sidebarName.textContent = fullName;
    
    const avatarLetter = fullName.charAt(0).toUpperCase();
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

    await loadDashboardData(token);
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
            
            if (firstAccNumber) firstAccNumber.textContent = formatted;
            if (firstAccBalance) firstAccBalance.textContent = firstAcc.balance.toFixed(2);
            if (firstAccType) firstAccType.textContent = firstAcc.accountType === 0 ? "Əmanət" : "Cari";
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

        // Render line chart with Chart.js
        renderLineChart(allTransactions);

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
    
    // Destroy previous instance of chart if it exists to prevent memory leaks/re-draw issues
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
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.04)',
                    borderWidth: 3,
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#10b981',
                    pointHoverRadius: 6
                },
                {
                    label: 'Xərc',
                    data: last6Months.map(m => m.expense),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.04)',
                    borderWidth: 3,
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#ef4444',
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
                        font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' },
                        padding: 15
                    }
                },
                tooltip: {
                    padding: 10,
                    bodyFont: { family: 'Plus Jakarta Sans' },
                    titleFont: { family: 'Plus Jakarta Sans', weight: '700' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(226, 232, 240, 0.6)' },
                    ticks: {
                        font: { family: 'Plus Jakarta Sans', size: 11 },
                        callback: function(value) {
                            return value.toFixed(0) + ' AZN';
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { family: 'Plus Jakarta Sans', size: 11 } }
                }
            }
        }
    });
}
