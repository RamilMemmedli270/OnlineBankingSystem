let currentFilter = "all";
let allNotifications = [];

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

    document.getElementById("tabAll").addEventListener("click", function () {
        setActiveTab("all");
        loadNotifications("all");
    });

    document.getElementById("tabUnread").addEventListener("click", function () {
        setActiveTab("unread");
        loadNotifications("unread");
    });

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            filterAndRenderNotifications();
        });
    }

    loadNotifications("all");
});

function setActiveTab(filter) {
    currentFilter = filter;
    const tabAll = document.getElementById("tabAll");
    const tabUnread = document.getElementById("tabUnread");
    if (!tabAll || !tabUnread) return;

    if (filter === "all") {
        tabAll.classList.add("active");
        tabAll.style.background = "#ffffff";
        tabAll.style.color = "var(--primary-color)";
        tabAll.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";

        tabUnread.classList.remove("active");
        tabUnread.classList.add("text-muted");
        tabUnread.style.background = "transparent";
        tabUnread.style.color = "#64748b";
        tabUnread.style.boxShadow = "none";
    } else {
        tabUnread.classList.add("active");
        tabUnread.style.background = "#ffffff";
        tabUnread.style.color = "var(--primary-color)";
        tabUnread.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";

        tabAll.classList.remove("active");
        tabAll.classList.add("text-muted");
        tabAll.style.background = "transparent";
        tabAll.style.color = "#64748b";
        tabAll.style.boxShadow = "none";
    }
}

async function loadNotifications(filter) {
    const token = localStorage.getItem("token");
    const container = document.getElementById("notificationsContainer");
    const emptyState = document.getElementById("emptyState");
    const emptyStateText = document.getElementById("emptyStateText");
    const loadingState = document.getElementById("loadingState");
    const alertBox = document.getElementById("alertBox");

    alertBox.classList.add("d-none");
    container.classList.add("d-none");
    emptyState.classList.add("d-none");
    loadingState.classList.remove("d-none");
    container.innerHTML = "";

    const url = filter === "unread"
        ? `${API_BASE_URL}/notification/unread`
        : `${API_BASE_URL}/notification`;

    try {
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (response.status === 401) {
            localStorage.clear();
            window.location.href = "index.html";
            return;
        }

        if (!response.ok) {
            let errorData = {};
            try {
                errorData = await response.json();
            } catch (err) {}
            throw new Error(errorData.message || "Bildirişləri yükləmək mümkün olmadı.");
        }

        const notifications = await response.json();
        allNotifications = notifications;
        filterAndRenderNotifications();

    } catch (error) {
        loadingState.classList.add("d-none");
        alertBox.textContent = error.message;
        alertBox.classList.remove("d-none");
    }
}

function createNotificationCard(notification) {
    const typeInfo = getTypeInfo(notification.type);
    const isRead = notification.isRead === true;
    const formattedDate = formatDate(notification.createdAt);

    const card = document.createElement("div");
    card.dataset.id = notification.id;
    card.className = "card border-0 mb-3 shadow-sm";
    card.style.borderRadius = "16px";
    card.style.transition = "all 0.2s";

    if (isRead) {
        card.style.background = "#f8fafc";
        card.style.opacity = "0.75";
        card.style.borderLeft = "4px solid #cbd5e1";
    } else {
        card.style.background = "#ffffff";
        card.style.borderLeft = "4px solid var(--primary-color)";
    }

    card.innerHTML = `
        <div class="card-body p-4">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <span class="fs-5">${typeInfo.icon}</span>
                        <h6 class="mb-0 ${isRead ? "text-dark" : "fw-bold text-dark"}" style="font-size: 0.95rem;">${escapeHtml(notification.title)}</h6>
                        <span class="badge py-1.5 px-2.5" style="${typeInfo.badgeStyle}">${typeInfo.label}</span>
                    </div>
                    <p class="mb-2 ${isRead ? "text-muted" : "text-dark"}" style="font-size: 0.88rem; line-height: 1.5;">${escapeHtml(notification.message)}</p>
                    <small class="text-muted d-block mt-2" style="font-size: 0.75rem;"><i class="bi bi-clock"></i> ${formattedDate}</small>
                </div>
                ${!isRead ? `<button class="btn btn-sm btn-outline-primary ms-3 mark-read-btn d-flex align-items-center gap-1 py-1.5 px-3" data-id="${notification.id}" style="border-radius: 8px; font-size: 0.8rem; font-weight: 600;"><i class="bi bi-check2"></i> Oxundu et</button>` : ""}
            </div>
        </div>
    `;

    const markReadBtn = card.querySelector(".mark-read-btn");
    if (markReadBtn) {
        markReadBtn.addEventListener("click", function () {
            markAsRead(notification.id, card);
        });
    }

    return card;
}

async function markAsRead(id, cardElement) {
    const token = localStorage.getItem("token");
    const btn = cardElement.querySelector(".mark-read-btn");

    if (btn) {
        btn.disabled = true;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/notification/${id}/read`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (response.status === 401) {
            localStorage.clear();
            window.location.href = "index.html";
            return;
        }

        if (!response.ok) {
            let errorData = {};
            try {
                errorData = await response.json();
            } catch (err) {}
            throw new Error(errorData.message || "Bildiriş oxunmuş kimi işarələnmədi.");
        }

        updateCardAsRead(cardElement);

        if (currentFilter === "unread") {
            cardElement.remove();
            const container = document.getElementById("notificationsContainer");
            if (container.children.length === 0) {
                container.classList.add("d-none");
                document.getElementById("emptyStateText").textContent = "Oxunmamış bildirişiniz yoxdur.";
                document.getElementById("emptyState").classList.remove("d-none");
            }
        }

    } catch (error) {
        if (btn) {
            btn.disabled = false;
        }
        const alertBox = document.getElementById("alertBox");
        alertBox.textContent = error.message;
        alertBox.classList.remove("d-none");
    }
}

function updateCardAsRead(cardElement) {
    cardElement.style.background = "#f8fafc";
    cardElement.style.opacity = "0.75";
    cardElement.style.borderLeft = "4px solid #cbd5e1";

    const title = cardElement.querySelector("h6");
    if (title) {
        title.classList.remove("fw-bold");
    }

    const message = cardElement.querySelector("p");
    if (message) {
        message.classList.remove("text-dark");
        message.classList.add("text-muted");
    }

    const btn = cardElement.querySelector(".mark-read-btn");
    if (btn) {
        btn.remove();
    }
}

function getTypeInfo(type) {
    const typeMap = {
        0: { label: "Balans Xəbərdarlığı", icon: "⚠️", badgeStyle: "background: rgba(239, 68, 68, 0.08); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.15); font-weight: 600; font-size: 0.7rem; border-radius: 6px;" },
        1: { label: "Kredit Statusu", icon: "📝", badgeStyle: "background: rgba(79, 70, 229, 0.08); color: var(--primary-color); border: 1px solid rgba(79, 70, 229, 0.15); font-weight: 600; font-size: 0.7rem; border-radius: 6px;" },
        2: { label: "Sistem Bildirişi", icon: "⚙️", badgeStyle: "background: rgba(108, 117, 125, 0.08); color: #6c757d; border: 1px solid rgba(108, 117, 125, 0.15); font-weight: 600; font-size: 0.7rem; border-radius: 6px;" },
        "LowBalance": { label: "Balans Xəbərdarlığı", icon: "⚠️", badgeStyle: "background: rgba(239, 68, 68, 0.08); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.15); font-weight: 600; font-size: 0.7rem; border-radius: 6px;" },
        "LoanStatus": { label: "Kredit Statusu", icon: "📝", badgeStyle: "background: rgba(79, 70, 229, 0.08); color: var(--primary-color); border: 1px solid rgba(79, 70, 229, 0.15); font-weight: 600; font-size: 0.7rem; border-radius: 6px;" },
        "System": { label: "Sistem Bildirişi", icon: "⚙️", badgeStyle: "background: rgba(108, 117, 125, 0.08); color: #6c757d; border: 1px solid rgba(108, 117, 125, 0.15); font-weight: 600; font-size: 0.7rem; border-radius: 6px;" }
    };

    return typeMap[type] || { label: String(type), icon: "🔔", badgeStyle: "background: rgba(108, 117, 125, 0.08); color: #6c757d; border: 1px solid rgba(108, 117, 125, 0.15); font-weight: 600; font-size: 0.7rem; border-radius: 6px;" };
}

function formatDate(dateString) {
    const dateObj = new Date(dateString);
    return dateObj.toLocaleDateString("az-AZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }) + " " + dateObj.toLocaleTimeString("az-AZ", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function filterAndRenderNotifications() {
    const searchInput = document.getElementById("searchInput");
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

    let filtered = allNotifications;

    if (query) {
        filtered = filtered.filter(notif => {
            const title = (notif.title || "").toLowerCase();
            const message = (notif.message || "").toLowerCase();
            return title.includes(query) || message.includes(query);
        });
    }

    renderNotificationsList(filtered);
}

function renderNotificationsList(notifications) {
    const container = document.getElementById("notificationsContainer");
    const emptyState = document.getElementById("emptyState");
    const emptyStateText = document.getElementById("emptyStateText");

    container.innerHTML = "";

    if (notifications.length === 0) {
        emptyStateText.textContent = currentFilter === "unread"
            ? "Oxunmamış bildirişiniz yoxdur."
            : "Hələ heç bir bildirişiniz yoxdur.";
        emptyState.classList.remove("d-none");
        return;
    }

    emptyState.classList.add("d-none");
    container.classList.remove("d-none");

    notifications.forEach(notification => {
        container.appendChild(createNotificationCard(notification));
    });
}