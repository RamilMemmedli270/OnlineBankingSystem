let currentFilter = "all";

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

    loadNotifications("all");
});

function setActiveTab(filter) {
    currentFilter = filter;
    document.getElementById("tabAll").classList.toggle("active", filter === "all");
    document.getElementById("tabUnread").classList.toggle("active", filter === "unread");
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
        loadingState.classList.add("d-none");

        if (notifications.length === 0) {
            emptyStateText.textContent = filter === "unread"
                ? "Oxunmamış bildirişiniz yoxdur."
                : "Hələ heç bir bildirişiniz yoxdur.";
            emptyState.classList.remove("d-none");
            return;
        }

        container.classList.remove("d-none");

        notifications.forEach(notification => {
            container.appendChild(createNotificationCard(notification));
        });

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
    card.className = `card shadow-sm mb-3 ${isRead ? "bg-light opacity-75" : "border-start border-4 border-primary bg-white"}`;
    card.dataset.id = notification.id;

    card.innerHTML = `
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-2">
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center gap-2 mb-1">
                        <h6 class="mb-0 ${isRead ? "" : "fw-bold"}">${escapeHtml(notification.title)}</h6>
                        <span class="badge ${typeInfo.badgeClass}">${typeInfo.label}</span>
                    </div>
                    <p class="mb-2 ${isRead ? "text-muted" : ""}">${escapeHtml(notification.message)}</p>
                    <small class="text-muted">${formattedDate}</small>
                </div>
                ${!isRead ? `<button class="btn btn-sm btn-outline-primary ms-3 mark-read-btn" data-id="${notification.id}">Oxundu et</button>` : ""}
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
    cardElement.classList.remove("border-start", "border-4", "border-primary", "bg-white");
    cardElement.classList.add("bg-light", "opacity-75");

    const title = cardElement.querySelector("h6");
    if (title) {
        title.classList.remove("fw-bold");
    }

    const message = cardElement.querySelector("p");
    if (message) {
        message.classList.add("text-muted");
    }

    const btn = cardElement.querySelector(".mark-read-btn");
    if (btn) {
        btn.remove();
    }
}

function getTypeInfo(type) {
    const typeMap = {
        0: { label: "LowBalance", badgeClass: "bg-warning text-dark" },
        1: { label: "LoanStatus", badgeClass: "bg-info text-dark" },
        2: { label: "System", badgeClass: "bg-secondary" },
        "LowBalance": { label: "LowBalance", badgeClass: "bg-warning text-dark" },
        "LoanStatus": { label: "LoanStatus", badgeClass: "bg-info text-dark" },
        "System": { label: "System", badgeClass: "bg-secondary" }
    };

    return typeMap[type] || { label: String(type), badgeClass: "bg-secondary" };
}

function formatDate(dateString) {
    const dateObj = new Date(dateString);
    return dateObj.toLocaleString("az-AZ", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}