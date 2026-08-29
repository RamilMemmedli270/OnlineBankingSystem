// Modern Dashboard Functionality
document.addEventListener("DOMContentLoaded", function() {
    loadDashboardData();
});

async function loadDashboardData() {
    const token = sessionStorage.getItem("token");
    const fullName = sessionStorage.getItem("fullName");

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // Set user info in header
    const userName = document.getElementById("userName");
    const userAvatar = document.getElementById("userAvatar");

    if (fullName) {
        userName.textContent = fullName;
        // Get first letter of name for avatar
        userAvatar.textContent = fullName.charAt(0).toUpperCase();
    }

    // Set current date
    const balanceDate = document.getElementById("balanceDate");
    const now = new Date();
    const months = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun", "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"];
    balanceDate.textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

    try {
        // Fetch accounts
        const accountsResponse = await fetch(`${API_BASE_URL}/account`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (accountsResponse.status === 401) {
            sessionStorage.clear();
            window.location.href = "index.html";
            return;
        }

        if (!accountsResponse.ok) {
            throw new Error("Hesablar yüklənərkən xəta baş verdi");
        }

        const accounts = await accountsResponse.json();

        // Calculate total balance
        let totalBalance = 0;
        accounts.forEach(account => {
            totalBalance += account.balance;
        });

        // Display total balance
        document.getElementById("totalBalance").textContent = totalBalance.toFixed(2);

        // Render account cards
        renderAccountCards(accounts);

        // Load notifications count
        await loadNotificationsCount(token);

        // Hide loading, show content
        document.getElementById("loadingState").style.display = "none";
        document.getElementById("dashboardContent").style.display = "block";

    } catch (error) {
        console.error("Dashboard yüklənərkən xəta:", error);
        document.getElementById("loadingState").innerHTML = `
            <div class="alert alert-danger">
                Məlumatlar yüklənərkən xəta baş verdi: ${error.message}
            </div>
        `;
    }
}

function renderAccountCards(accounts) {
    const container = document.getElementById("accountCardsContainer");
    container.innerHTML = "";

    if (accounts.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-info">
                    Hesabınız yoxdur. <a href="accounts.html">Yeni hesab yaradın</a>
                </div>
            </div>
        `;
        return;
    }

    accounts.forEach((account, index) => {
        const accountType = account.accountType === 0 ? "Əmanət Hesabı" : "Cari Hesab";
        const cardClass = index % 2 === 0 ? "" : "dark";
        const statusBadge = account.status === 0 ?
            '<span style="background: rgba(16, 185, 129, 0.2); color: #10b981; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">AKTIV</span>' :
            '<span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">DONDURULUB</span>';

        const cardHTML = `
            <div class="account-card ${cardClass}">
                <div class="account-type">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>${accountType}</span>
                        ${statusBadge}
                    </div>
                </div>
                <div class="account-balance-label">Cari Balans</div>
                <div class="account-balance-amount">${account.balance.toFixed(2)} AZN</div>
                <div class="account-number">${formatAccountNumber(account.accountNumber)}</div>
                <div class="account-footer">
                    <span>Hesab №${account.id}</span>
                    <span class="account-logo">VISA</span>
                </div>
            </div>
        `;

        container.innerHTML += cardHTML;
    });
}

function formatAccountNumber(accountNumber) {
    // Format: XXXX XXXX XXXX XXXX
    if (!accountNumber) return "";
    const cleaned = accountNumber.replace(/\s/g, '');
    return cleaned.match(/.{1,4}/g)?.join(' ') || accountNumber;
}

async function loadNotificationsCount(token) {
    try {
        const response = await fetch(`${API_BASE_URL}/notification`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (response.ok) {
            const notifications = await response.json();
            const unreadCount = notifications.filter(n => !n.isRead).length;

            if (unreadCount > 0) {
                const badge = document.getElementById("notificationBadge");
                badge.textContent = unreadCount > 9 ? "9+" : unreadCount;
                badge.style.display = "flex";
            }
        }
    } catch (error) {
        console.log("Bildirişlər yüklənərkən xəta:", error);
    }
}
