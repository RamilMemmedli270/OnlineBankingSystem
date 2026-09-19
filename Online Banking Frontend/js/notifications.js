let currentFilter = "all";
let allNotifications = [];

document.addEventListener("DOMContentLoaded", function () {
    const token = getAuthToken();

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    const roles = getAuthRoles();

    if (roles.includes("Admin") && !roles.includes("Customer")) {
        window.location.href = "admin.html";
        return;
    }

    // User Profile in Navbar & Sidebar
    const fullName = getAuthFullName();
    const avatarLetter = fullName.charAt(0).toUpperCase();

    const topAvatar = document.getElementById("topAvatar") || document.getElementById("userAvatar");
    const headerFullName = document.getElementById("headerFullName") || document.getElementById("userFullName");
    const fullNameDisplay = document.getElementById("fullNameDisplay");
    const sidebarRole = document.getElementById("sidebarRole") || document.getElementById("userRole");
    const adminLinkWrapper = document.getElementById("adminLinkWrapper") || document.getElementById("adminNavWrapper");

    if (topAvatar) topAvatar.textContent = avatarLetter;
    if (headerFullName) headerFullName.textContent = fullName;
    if (fullNameDisplay) fullNameDisplay.textContent = fullName;
    if (sidebarRole) sidebarRole.textContent = roles.includes("Admin") ? "Administrator" : "Müştəri";
    if (adminLinkWrapper && roles.includes("Admin")) {
        adminLinkWrapper.style.display = "block";
    }

    const logoutAction = (e) => {
        e.preventDefault();
        clearAuth();
        window.location.href = "index.html";
    };

    const logoutBtn = document.getElementById("logoutBtn");
    const dashLogoutBtn = document.getElementById("dashLogoutBtn");
    const dropdownLogoutBtn = document.getElementById("dropdownLogoutBtn");

    if (logoutBtn) logoutBtn.addEventListener("click", logoutAction);
    if (dashLogoutBtn) dashLogoutBtn.addEventListener("click", logoutAction);
    if (dropdownLogoutBtn) dropdownLogoutBtn.addEventListener("click", logoutAction);



    // Tab buttons
    const tabAll = document.getElementById("tabAll");
    const tabUnread = document.getElementById("tabUnread");
    if (tabAll) {
        tabAll.addEventListener("click", function () {
            setActiveTab("all");
            loadNotifications("all");
        });
    }
    if (tabUnread) {
        tabUnread.addEventListener("click", function () {
            setActiveTab("unread");
            loadNotifications("unread");
        });
    }

    // Search filter
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
        tabUnread.classList.remove("active");
    } else {
        tabUnread.classList.add("active");
        tabAll.classList.remove("active");
    }
}

async function loadNotifications(filter) {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const container = document.getElementById("notificationsContainer");
    const emptyState = document.getElementById("emptyState");
    const loadingState = document.getElementById("loadingState");
    const alertBox = document.getElementById("alertBox");

    if (alertBox) alertBox.classList.add("d-none");
    if (container) {
        container.classList.add("d-none");
        container.innerHTML = "";
    }
    if (emptyState) emptyState.classList.add("d-none");
    if (loadingState) loadingState.classList.remove("d-none");

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
            clearAuth();
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
        allNotifications = Array.isArray(notifications) ? notifications : [];

        // Check for unread dot
        const unreadCount = allNotifications.filter(n => !n.isRead).length;
        const unreadBadgeDot = document.getElementById("unreadBadgeDot");
        if (unreadBadgeDot) {
            unreadBadgeDot.style.display = unreadCount > 0 ? "block" : "none";
        }

        if (loadingState) loadingState.classList.add("d-none");
        filterAndRenderNotifications();

    } catch (error) {
        if (loadingState) loadingState.classList.add("d-none");
        if (alertBox) {
            alertBox.textContent = error.message;
            alertBox.classList.remove("d-none");
        }
    }
}

function cleanMessage(text) {
    if (!text) return "";
    return text.replace(/bal[аa][нn][сs][ıi]/g, "balansı")
               .replace(/bal[аa][нn]/g, "balan")
               .replace(/[\u0430]/g, "a")
               .replace(/[\u043D]/g, "n")
               .replace(/[\u0441]/g, "s");
}

function getTypeInfo(type, title) {
    if (title && (title.includes("Mədaxil") || title.includes("Balans Artırıldı") || title.includes("Köçürmə"))) {
        return {
            label: "Mədaxil",
            icon: "💸",
            bgIcon: "rgba(16, 229, 153, 0.12)",
            badgeStyle: "background: rgba(16, 229, 153, 0.15); color: #10e599; border: 1px solid rgba(16, 229, 153, 0.3);"
        };
    }

    if (type === 0 || type === "LowBalance" || (title && title.includes("Balans"))) {
        return {
            label: "Balans Xəbərdarlığı",
            icon: "⚠️",
            bgIcon: "rgba(239, 68, 68, 0.12)",
            badgeStyle: "background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3);"
        };
    }

    if (type === 1 || type === "LoanStatus" || (title && title.includes("Kredit"))) {
        return {
            label: "Kredit Statusu",
            icon: "📝",
            bgIcon: "rgba(99, 102, 241, 0.12)",
            badgeStyle: "background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3);"
        };
    }

    return {
        label: "Sistem Bildirişi",
        icon: "⚙️",
        bgIcon: "rgba(148, 163, 184, 0.12)",
        badgeStyle: "background: rgba(148, 163, 184, 0.15); color: #cbd5e1; border: 1px solid rgba(148, 163, 184, 0.3);"
    };
}

function createNotificationCard(notification) {
    const typeInfo = getTypeInfo(notification.type, notification.title);
    const isRead = notification.isRead === true;
    const formattedDate = formatDate(notification.createdAt);

    const titleText = cleanMessage(notification.title);
    const messageText = cleanMessage(notification.message);

    const card = document.createElement("div");
    card.dataset.id = notification.id;
    card.className = `notif-card ${isRead ? "read" : "unread"}`;

    card.innerHTML = `
        <div class="d-flex align-items-start justify-content-between gap-3">
            <div class="d-flex align-items-start gap-3 flex-grow-1">
                <div class="notif-icon-circle" style="background: ${typeInfo.bgIcon};">
                    ${typeInfo.icon}
                </div>
                <div class="flex-grow-1">
                    <div class="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <h6 class="mb-0 fw-bold text-white" style="font-size: 0.95rem;">${escapeHtml(titleText)}</h6>
                        <span class="badge py-1 px-2.5 rounded-pill" style="${typeInfo.badgeStyle}; font-size: 0.72rem; font-weight: 700;">${typeInfo.label}</span>
                    </div>
                    <p class="mb-2 text-white-50" style="font-size: 0.88rem; line-height: 1.5;">${escapeHtml(messageText)}</p>
                    <div class="text-muted" style="font-size: 0.75rem;">
                        <i class="bi bi-clock me-1"></i> ${formattedDate}
                    </div>
                </div>
            </div>
            ${!isRead ? `
                <button class="btn-mark-read mark-read-btn" data-id="${notification.id}" title="Oxundu kimi işarələ">
                    <i class="bi bi-check2"></i>
                    <span>Oxundu</span>
                </button>
            ` : ""}
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
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const btn = cardElement.querySelector(".mark-read-btn");

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span>`;
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
            clearAuth();
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

        // Update local object
        const target = allNotifications.find(n => n.id === id);
        if (target) target.isRead = true;

        if (currentFilter === "unread") {
            cardElement.remove();
            const container = document.getElementById("notificationsContainer");
            if (container && container.children.length === 0) {
                container.classList.add("d-none");
                const emptyState = document.getElementById("emptyState");
                const emptyStateTitle = document.getElementById("emptyStateTitle");
                const emptyStateText = document.getElementById("emptyStateText");
                if (emptyStateTitle) emptyStateTitle.textContent = "Oxunmamış bildirişiniz yoxdur";
                if (emptyStateText) emptyStateText.textContent = "Bütün bildirişlərinizi nəzərdən keçirmisiniz.";
                if (emptyState) emptyState.classList.remove("d-none");
            }
        } else {
            cardElement.className = "notif-card read";
            if (btn) btn.remove();
        }

        // Update dot
        const remainingUnread = allNotifications.filter(n => !n.isRead).length;
        const unreadBadgeDot = document.getElementById("unreadBadgeDot");
        if (unreadBadgeDot) {
            unreadBadgeDot.style.display = remainingUnread > 0 ? "block" : "none";
        }

    } catch (error) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="bi bi-check2"></i> <span>Oxundu</span>`;
        }
        const alertBox = document.getElementById("alertBox");
        if (alertBox) {
            alertBox.textContent = error.message;
            alertBox.classList.remove("d-none");
        }
    }
}

function formatDate(dateString) {
    if (!dateString) return "";
    const dateObj = typeof parseUtcDate === "function" ? parseUtcDate(dateString) : new Date(dateString);
    if (!dateObj || isNaN(dateObj.getTime())) return "";
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
    const emptyStateTitle = document.getElementById("emptyStateTitle");
    const emptyStateText = document.getElementById("emptyStateText");

    if (!container) return;
    container.innerHTML = "";

    if (!notifications || notifications.length === 0) {
        if (emptyStateTitle) {
            emptyStateTitle.textContent = currentFilter === "unread"
                ? "Oxunmamış bildirişiniz yoxdur"
                : "Hələ heç bir bildirişiniz yoxdur";
        }
        if (emptyStateText) {
            emptyStateText.textContent = currentFilter === "unread"
                ? "Bütün bildirişlərinizi nəzərdən keçirmisiniz."
                : "Hesabınızla bağlı bütün mühüm xəbərdarlıqlar və yeniliklər burada göstəriləcəkdir.";
        }
        if (emptyState) emptyState.classList.remove("d-none");
        container.classList.add("d-none");
        return;
    }

    if (emptyState) emptyState.classList.add("d-none");
    container.classList.remove("d-none");

    notifications.forEach(notification => {
        container.appendChild(createNotificationCard(notification));
    });
}
