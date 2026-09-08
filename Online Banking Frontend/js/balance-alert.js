// ==========================================================================
// ONLINEBANK — BALANCE ALERT SETTINGS CONTROLLER (balance-alert.js)
// Desktop Web Banking Layout: Account selector, 5 toggle switches,
// threshold input & quick pills, save button, and recent notifications feed.
// ==========================================================================

let userAccounts = [];
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

    // 4. Interactive Controls (Pills, Toggles)
    setupInteractiveControls();

    // 5. Load Accounts into Selector
    await loadAccounts(token);

    // 6. Load Alert Setting
    await loadAlertSettings(token);

    // 7. Load Extra Preferences from LocalStorage
    loadExtraPreferences();

    // 8. Load Recent Notifications
    await loadRecentAlerts(token);

    // 9. Form Submission
    const form = document.getElementById("balanceAlertForm");
    if (form) {
        form.addEventListener("submit", function (e) {
            handleSaveSettings(e, token);
        });
    }

    // 10. Check Unread Notifications
    loadUnreadNotifications(token);
});

// --- Profile & User Info ---
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
    const months = [
        "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun",
        "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr"
    ];
    dateEl.textContent = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

function setupLogoutHandlers() {
    const logoutAction = (e) => {
        e.preventDefault();
        clearAuth();
        window.location.href = "index.html";
    };

    const dashLogout = document.getElementById("dashLogoutBtn");
    const dropLogout = document.getElementById("dropdownLogoutBtn");

    if (dashLogout) dashLogout.addEventListener("click", logoutAction);
    if (dropLogout) dropLogout.addEventListener("click", logoutAction);
}

// --- Eye Toggle for Balance Visibility ---
function toggleBalanceVisibility() {
    isBalanceHidden = !isBalanceHidden;
    const eyeIcon = document.getElementById("toggleEyeIcon");
    if (eyeIcon) {
        eyeIcon.className = isBalanceHidden ? "bi bi-eye-slash" : "bi bi-eye";
    }

    updateAccountBalanceDisplay();
}

// --- Interactive Controls: Pills & Toggles ---
function setupInteractiveControls() {
    const thresholdInput = document.getElementById("thresholdAmountInput");
    const lowBalanceToggle = document.getElementById("lowBalanceToggle");
    const thresholdInputWrap = document.getElementById("thresholdInputWrap");
    const pills = document.querySelectorAll(".threshold-pill");

    // Quick pills click
    pills.forEach(pill => {
        pill.addEventListener("click", function () {
            const amt = this.dataset.amt;
            if (thresholdInput) {
                thresholdInput.value = amt;
            }
            pills.forEach(p => p.classList.remove("active"));
            this.classList.add("active");
        });
    });

    // Input typing updates active pill
    if (thresholdInput) {
        thresholdInput.addEventListener("input", function () {
            const currentVal = parseFloat(this.value);
            pills.forEach(p => {
                if (parseFloat(p.dataset.amt) === currentVal) {
                    p.classList.add("active");
                } else {
                    p.classList.remove("active");
                }
            });
        });
    }

    // Low balance toggle visual feedback
    if (lowBalanceToggle && thresholdInputWrap) {
        lowBalanceToggle.addEventListener("change", function () {
            if (this.checked) {
                thresholdInputWrap.style.opacity = "1";
                thresholdInputWrap.style.pointerEvents = "auto";
            } else {
                thresholdInputWrap.style.opacity = "0.35";
                thresholdInputWrap.style.pointerEvents = "none";
            }
        });
    }
}

// --- Account Selector ---
async function loadAccounts(token) {
    const select = document.getElementById("alertAccountSelect");
    if (!select) return;

    try {
        const res = await fetch(`${API_BASE_URL}/account`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (res.status === 401) {
            clearAuth();
            window.location.href = "index.html";
            return;
        }

        if (!res.ok) throw new Error("Hesabları yükləmək mümkün olmadı.");

        userAccounts = await res.json();

        select.innerHTML = "";
        if (userAccounts.length === 0) {
            select.innerHTML = `<option value="" disabled selected>Aktiv hesab tapılmadı</option>`;
            return;
        }

        userAccounts.forEach((acc, idx) => {
            const typeLabel = acc.accountType === 1 ? "Cari Hesab" : "Yığım Hesabı";
            const masked = maskAccountNumber(acc.accountNumber);
            const opt = document.createElement("option");
            opt.value = acc.id;
            opt.textContent = `${typeLabel} • ${masked} (₼ ${acc.balance.toFixed(2)})`;
            if (idx === 0) opt.selected = true;
            select.appendChild(opt);
        });

        select.addEventListener("change", updateAccountBalanceDisplay);
        updateAccountBalanceDisplay();

    } catch (err) {
        console.error("Hesab yükləmə xətası:", err);
        select.innerHTML = `<option value="" disabled selected>Hesabları yükləmək mümkün olmadı</option>`;
    }
}

function updateAccountBalanceDisplay() {
    const select = document.getElementById("alertAccountSelect");
    const balanceDisplay = document.getElementById("selectedAccBalanceDisplay");
    if (!select || !balanceDisplay) return;

    const selectedId = parseInt(select.value);
    const selectedAcc = userAccounts.find(a => a.id === selectedId);

    if (selectedAcc) {
        if (isBalanceHidden) {
            balanceDisplay.textContent = "••••••";
        } else {
            balanceDisplay.textContent = `${selectedAcc.balance.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₼`;
        }
    } else {
        balanceDisplay.textContent = isBalanceHidden ? "••••••" : "0.00 ₼";
    }
}

// --- Load Backend Alert Setting ---
async function loadAlertSettings(token) {
    const thresholdInput = document.getElementById("thresholdAmountInput");
    const lowBalanceToggle = document.getElementById("lowBalanceToggle");
    const thresholdInputWrap = document.getElementById("thresholdInputWrap");
    const pills = document.querySelectorAll(".threshold-pill");

    try {
        const res = await fetch(`${API_BASE_URL}/balancealertsetting`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (res.status === 401) {
            clearAuth();
            window.location.href = "index.html";
            return;
        }

        if (res.status === 404) {
            // Setting doesn't exist yet for user -> default 50 AZN, enabled
            if (thresholdInput) thresholdInput.value = "50";
            if (lowBalanceToggle) lowBalanceToggle.checked = true;
            return;
        }

        if (!res.ok) throw new Error("Xəbərdarlıq ayarlarını almaq mümkün olmadı.");

        const setting = await res.json();
        const thresholdVal = setting.threshold || 50;

        if (thresholdInput) {
            thresholdInput.value = thresholdVal;
        }

        if (lowBalanceToggle) {
            lowBalanceToggle.checked = setting.isEnabled !== false;
            if (thresholdInputWrap) {
                thresholdInputWrap.style.opacity = setting.isEnabled !== false ? "1" : "0.35";
                thresholdInputWrap.style.pointerEvents = setting.isEnabled !== false ? "auto" : "none";
            }
        }

        // Highlight active pill if matches
        pills.forEach(p => {
            if (parseFloat(p.dataset.amt) === thresholdVal) {
                p.classList.add("active");
            } else {
                p.classList.remove("active");
            }
        });

    } catch (err) {
        console.error("Alert setting error:", err);
    }
}

// --- Load / Save Extra Preferences ---
function loadExtraPreferences() {
    const prefsJson = localStorage.getItem("onlinebank_extra_alert_prefs");
    if (!prefsJson) return;

    try {
        const prefs = JSON.parse(prefsJson);
        const lgDep = document.getElementById("largeDepositToggle");
        const lgWdr = document.getElementById("largeWithdrawToggle");
        const schPay = document.getElementById("scheduledPaymentToggle");
        const stmtRdy = document.getElementById("statementReadyToggle");

        if (lgDep && prefs.largeDeposit !== undefined) lgDep.checked = prefs.largeDeposit;
        if (lgWdr && prefs.largeWithdraw !== undefined) lgWdr.checked = prefs.largeWithdraw;
        if (schPay && prefs.scheduledPayment !== undefined) schPay.checked = prefs.scheduledPayment;
        if (stmtRdy && prefs.statementReady !== undefined) stmtRdy.checked = prefs.statementReady;
    } catch (e) {
        console.error("Failed to parse extra alert prefs", e);
    }
}

function saveExtraPreferences() {
    const lgDep = document.getElementById("largeDepositToggle");
    const lgWdr = document.getElementById("largeWithdrawToggle");
    const schPay = document.getElementById("scheduledPaymentToggle");
    const stmtRdy = document.getElementById("statementReadyToggle");

    const prefs = {
        largeDeposit: lgDep ? lgDep.checked : true,
        largeWithdraw: lgWdr ? lgWdr.checked : true,
        scheduledPayment: schPay ? schPay.checked : true,
        statementReady: stmtRdy ? stmtRdy.checked : true
    };

    localStorage.setItem("onlinebank_extra_alert_prefs", JSON.stringify(prefs));
}

// --- Handle Save Settings Submit ---
async function handleSaveSettings(e, token) {
    e.preventDefault();

    const saveStatus = document.getElementById("saveAlertStatus");
    const submitBtn = document.getElementById("btnSaveAlertSettings");
    const thresholdInput = document.getElementById("thresholdAmountInput");
    const lowBalanceToggle = document.getElementById("lowBalanceToggle");

    if (!thresholdInput || !lowBalanceToggle) return;

    const threshold = parseFloat(thresholdInput.value);
    const isEnabled = lowBalanceToggle.checked;

    if (isNaN(threshold) || threshold < 0) {
        showStatusMessage("Zəhmət olmasa düzgün və müsbət hədd məbləği daxil edin.", "danger");
        return;
    }

    // Disable button during call
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Yadda saxlanılır...`;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/balancealertsetting`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                threshold: threshold,
                isEnabled: isEnabled
            })
        });

        if (res.status === 401) {
            clearAuth();
            window.location.href = "index.html";
            return;
        }

        if (!res.ok) {
            let errMsg = "Tənzimləmələri yadda saxlamaq mümkün olmadı.";
            try {
                const errData = await res.json();
                if (errData.message) errMsg = errData.message;
            } catch (_) {}
            throw new Error(errMsg);
        }

        // Save local extra preferences
        saveExtraPreferences();

        showStatusMessage("Balans xəbərdarlığı tənzimləmələri uğurla yadda saxlanıldı!", "success");

    } catch (err) {
        showStatusMessage(err.message || "Xəta baş verdi.", "danger");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="bi bi-check2-circle me-1"></i><span>Dəyişiklikləri Saxla (Save Changes)</span>`;
        }
    }
}

function showStatusMessage(msg, type) {
    const saveStatus = document.getElementById("saveAlertStatus");
    if (!saveStatus) return;

    saveStatus.className = `alert alert-${type === "success" ? "success" : "danger"} alert-dismissible fade show mb-4`;
    saveStatus.innerHTML = `
        <i class="bi ${type === "success" ? "bi-check-circle-fill" : "bi-exclamation-octagon-fill"} me-2"></i>
        <span>${msg}</span>
        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    saveStatus.classList.remove("d-none");

    if (type === "success") {
        setTimeout(() => {
            saveStatus.classList.add("d-none");
        }, 5000);
    }
}

// --- Load Recent Notifications / Alerts ---
async function loadRecentAlerts(token) {
    const listEl = document.getElementById("recentAlertsList");
    if (!listEl) return;

    try {
        const res = await fetch(`${API_BASE_URL}/notification`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!res.ok) throw new Error("Bildirişləri yükləmək mümkün olmadı.");

        const notifs = await res.json();

        if (!notifs || notifs.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-4 text-muted small">
                    <i class="bi bi-bell-slash fs-3 d-block mb-2 opacity-50"></i>
                    Hazırda heç bir bildirişiniz yoxdur.
                </div>
            `;
            return;
        }

        // Take top 5 most recent
        const recent = notifs.slice(0, 5);

        listEl.innerHTML = recent.map(n => {
            let iconClass = "bi-bell-fill text-info";
            if (n.type === 0) iconClass = "bi-exclamation-triangle-fill text-warning"; // LowBalance
            else if (n.type === 1) iconClass = "bi-bank text-success"; // LoanStatus
            else iconClass = "bi-shield-check text-primary"; // System

            const unreadClass = !n.isRead ? "unread" : "";
            const formattedDate = formatDateAz(n.createdAt);

            return `
                <div class="notification-feed-item ${unreadClass}">
                    <div class="alert-icon-box" style="width: 36px; height: 36px; font-size: 1rem;">
                        <i class="bi ${iconClass}"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-baseline mb-1">
                            <h6 class="fw-bold text-white small mb-0">${escapeHtml(n.title)}</h6>
                            <span class="text-muted" style="font-size: 0.72rem;">${formattedDate}</span>
                        </div>
                        <p class="text-muted small mb-1" style="line-height: 1.35; font-size: 0.8rem;">
                            ${escapeHtml(n.message)}
                        </p>
                        ${!n.isRead ? `
                            <button class="btn btn-sm btn-link text-success p-0 small text-decoration-none" 
                                    style="font-size: 0.75rem;" 
                                    onclick="markNotificationRead(${n.id}, this)">
                                <i class="bi bi-check2 me-1"></i>Oxunmuş kimi qeyd et
                            </button>
                        ` : ''}
                    </div>
                    ${!n.isRead ? '<div class="notif-badge-dot"></div>' : ''}
                </div>
            `;
        }).join("");

    } catch (err) {
        console.error("Recent alerts error:", err);
        listEl.innerHTML = `
            <div class="text-center py-4 text-muted small">
                Bildirişləri yükləmək mümkün olmadı.
            </div>
        `;
    }
}

// Mark single notification as read
window.markNotificationRead = async function (id, btn) {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch(`${API_BASE_URL}/notification/${id}/read`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (res.ok) {
            const feedItem = btn.closest(".notification-feed-item");
            if (feedItem) {
                feedItem.classList.remove("unread");
                const dot = feedItem.querySelector(".notif-badge-dot");
                if (dot) dot.remove();
                btn.remove();
            }
            loadUnreadNotifications(token);
        }
    } catch (err) {
        console.error("Failed to mark as read", err);
    }
};

// Check unread count for badges
async function loadUnreadNotifications(token) {
    const sidebarBadge = document.getElementById("sidebarNotificationBadge");
    const unreadDot = document.getElementById("unreadBadgeDot");

    try {
        const res = await fetch(`${API_BASE_URL}/notification/unread`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (res.ok) {
            const unreadList = await res.json();
            const count = unreadList.length;

            if (sidebarBadge) {
                if (count > 0) {
                    sidebarBadge.textContent = count > 99 ? "99+" : count;
                    sidebarBadge.style.display = "inline-block";
                } else {
                    sidebarBadge.style.display = "none";
                }
            }

            if (unreadDot) {
                unreadDot.style.display = count > 0 ? "inline-block" : "none";
            }
        }
    } catch (e) {
        console.error("Unread notifications error", e);
    }
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
