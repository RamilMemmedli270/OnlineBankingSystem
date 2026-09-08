// ==========================================================================
// ONLINEBANK — LOANS CONTROLLER (loans.js)
// F8: Loan application workflow, calculator, active loan metrics & status tracker
// ==========================================================================

let userLoans = [];
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

    // 4. Setup Live Loan Calculator in Modal
    setupLoanCalculator();

    // 5. Setup Loan Application Form Submission
    setupLoanForm(token);

    // 6. Load User Loans from API
    await loadLoans(token);

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

// --- Load Dynamic Loans from API ---
async function loadLoans(token) {
    const container = document.getElementById("loanApplicationsContainer");
    try {
        const res = await fetch(`${API_BASE_URL}/loanapplication/my`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!res.ok) {
            if (res.status === 401) {
                localStorage.clear();
                window.location.href = "index.html";
                return;
            }
            throw new Error("Kredit məlumatları alına bilmədi.");
        }

        userLoans = await res.json();
        renderActiveLoanCard(userLoans);
        renderLoanApplications(userLoans);

    } catch (err) {
        if (container) {
            container.innerHTML = `<p class="text-danger small text-center py-3">${err.message}</p>`;
        }
    }
}

// --- Render Active Loan Card (Matching Mockup) ---
function renderActiveLoanCard(loans) {
    const activeCard = document.getElementById("activeLoanCard");
    const emptyCard = document.getElementById("noActiveLoanCard");

    // Check if user has an approved active loan (status === 1)
    const approvedLoan = loans.find(l => l.status === 1);

    if (!approvedLoan) {
        if (activeCard) activeCard.classList.add("d-none");
        if (emptyCard) emptyCard.classList.remove("d-none");
        return;
    }

    if (activeCard) activeCard.classList.remove("d-none");
    if (emptyCard) emptyCard.classList.add("d-none");

    const amount = Number(approvedLoan.amount) || 0;
    const term = Number(approvedLoan.term) || 12;
    const annualRate = 0.12; // 12% annual interest

    // Mock progress ratio (65% as per user mockup or dynamic)
    const paidPercent = 35; // 35% paid, 65% remaining
    const remainingBalance = amount * (1 - paidPercent / 100);
    const monthlyPayment = (amount * (1 + annualRate * (term / 12))) / term;

    const amountEl = document.getElementById("activeLoanAmount");
    const remainingEl = document.getElementById("activeLoanRemaining");
    const percentEl = document.getElementById("activeLoanPercent");
    const progressEl = document.getElementById("activeLoanProgressBar");
    const monthlyEl = document.getElementById("activeLoanMonthly");
    const nextDateEl = document.getElementById("activeLoanNextDate");
    const interestEl = document.getElementById("activeLoanInterest");

    if (amountEl) {
        amountEl.textContent = isBalanceHidden ? "••••••" : `₼ ${formatMoney(amount)}`;
    }
    if (remainingEl) {
        remainingEl.textContent = isBalanceHidden ? "••••••" : `₼ ${formatMoney(remainingBalance)}`;
    }
    if (percentEl) {
        percentEl.textContent = `${paidPercent}% ödənilib`;
    }
    if (progressEl) {
        progressEl.style.width = `${paidPercent}%`;
    }
    if (monthlyEl) {
        monthlyEl.textContent = isBalanceHidden ? "••••" : `₼ ${formatMoney(monthlyPayment)}`;
    }
    if (nextDateEl) {
        // Next payment date: 25th of current or next month
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 25);
        nextDateEl.textContent = formatDateShort(nextMonth.toISOString());
    }
    if (interestEl) {
        interestEl.textContent = "12.0%";
    }
}

// --- Render Loan Applications List (Matching Mockup) ---
function renderLoanApplications(loans) {
    const container = document.getElementById("loanApplicationsContainer");
    const countText = document.getElementById("loanAppCountText");
    if (!container) return;

    if (countText) {
        countText.textContent = `${loans.length} müraciət`;
    }

    container.innerHTML = "";

    if (!loans || loans.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="bi bi-inbox fs-2 d-block mb-2 text-muted"></i>
                <p class="small mb-0">Hələlik heç bir kredit müraciətiniz yoxdur.</p>
            </div>
        `;
        return;
    }

    // Sort newest first
    const sorted = [...loans].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    sorted.forEach(loan => {
        const item = document.createElement("div");
        item.className = "loan-app-item";

        let statusBadge = "";
        if (loan.status === 0) { // Pending
            statusBadge = `<span class="badge-status-pending"><i class="bi bi-clock-history"></i> Pending 🟡 (Gözləmədə)</span>`;
        } else if (loan.status === 1) { // Approved
            statusBadge = `<span class="badge-status-approved"><i class="bi bi-check-circle-fill"></i> Approved 🟢 (Təsdiqləndi)</span>`;
        } else if (loan.status === 2) { // Declined
            statusBadge = `<span class="badge-status-declined"><i class="bi bi-x-circle-fill"></i> Declined 🔴 (İmtina)</span>`;
        }

        const reason = loan.reason || "Fərdi Kredit (Personal Loan)";
        const amountStr = `₼ ${formatMoney(loan.amount)}`;
        const dateStr = formatDate(loan.createdAt);

        let rejectionHtml = "";
        if (loan.status === 2 && loan.rejectionReason) {
            rejectionHtml = `<div class="small text-danger mt-1"><i class="bi bi-info-circle me-1"></i>Səbəb: ${escapeHtml(loan.rejectionReason)}</div>`;
        }

        item.innerHTML = `
            <div class="d-flex align-items-center gap-3">
                <div class="tx-icon-circle ${loan.status === 1 ? 'deposit' : (loan.status === 0 ? 'transfer' : 'withdraw')}" style="width: 40px; height: 40px;">
                    <i class="bi ${loan.status === 1 ? 'bi-shield-check' : (loan.status === 0 ? 'bi-hourglass-split' : 'bi-shield-x')}"></i>
                </div>
                <div>
                    <div class="loan-app-title">${escapeHtml(reason)}</div>
                    <div class="loan-app-sub">${loan.term} ay müddətinə • ${dateStr}</div>
                    ${rejectionHtml}
                </div>
            </div>

            <div class="text-end">
                <div class="loan-app-amount">${amountStr}</div>
                <div class="mt-1">${statusBadge}</div>
            </div>
        `;
        container.appendChild(item);
    });
}

// --- Interactive Loan Calculator in Modal ---
function setupLoanCalculator() {
    const amtRange = document.getElementById("loanAmountRange");
    const termRange = document.getElementById("loanTermRange");
    const amtDisplay = document.getElementById("calcAmountDisplay");
    const termDisplay = document.getElementById("calcTermDisplay");
    const monthlyDisplay = document.getElementById("calcMonthlyPayment");
    const totalDisplay = document.getElementById("calcTotalPayment");
    const quickTermPills = document.querySelectorAll('.quick-amt-pill[data-term]');

    function updateCalc() {
        const amount = parseFloat(amtRange.value) || 5000;
        const term = parseInt(termRange.value) || 12;
        const annualRate = 0.12; // 12%

        amtDisplay.textContent = `${formatMoney(amount)} ₼`;
        termDisplay.textContent = `${term} ay`;

        const totalInterest = amount * annualRate * (term / 12);
        const totalPayment = amount + totalInterest;
        const monthlyPayment = totalPayment / term;

        monthlyDisplay.textContent = `₼ ${formatMoney(monthlyPayment)}`;
        totalDisplay.textContent = `₼ ${formatMoney(totalPayment)}`;
    }

    if (amtRange) {
        amtRange.addEventListener("input", updateCalc);
    }
    if (termRange) {
        termRange.addEventListener("input", function () {
            quickTermPills.forEach(p => p.classList.remove("active"));
            const matchPill = document.querySelector(`.quick-amt-pill[data-term="${termRange.value}"]`);
            if (matchPill) matchPill.classList.add("active");
            updateCalc();
        });
    }

    quickTermPills.forEach(pill => {
        pill.addEventListener("click", function () {
            quickTermPills.forEach(p => p.classList.remove("active"));
            this.classList.add("active");
            termRange.value = this.dataset.term;
            updateCalc();
        });
    });

    updateCalc();
}

// --- Submit Loan Application Form ---
function setupLoanForm(token) {
    const form = document.getElementById("applyLoanForm");
    const alertBox = document.getElementById("applyLoanAlert");
    const submitBtn = document.getElementById("btnSubmitLoanApplication");

    if (!form) return;

    form.addEventListener("submit", async function (e) {
        e.preventDefault();

        const amount = parseFloat(document.getElementById("loanAmountRange").value);
        const term = parseInt(document.getElementById("loanTermRange").value);
        const reason = document.getElementById("loanReasonInput").value.trim();

        if (isNaN(amount) || amount < 100 || amount > 50000) {
            showAlert(alertBox, "Kredit məbləği 100 - 50,000 AZN aralığında olmalıdır.", "danger");
            return;
        }

        if (isNaN(term) || term < 3 || term > 48) {
            showAlert(alertBox, "Kredit müddəti 3 - 48 ay aralığında olmalıdır.", "danger");
            return;
        }

        if (!reason) {
            showAlert(alertBox, "Zəhmət olmasa kreditin məqsədini qeyd edin.", "danger");
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Göndərilir...';

        try {
            const res = await fetch(`${API_BASE_URL}/loanapplication`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    amount: amount,
                    term: term,
                    reason: reason
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Müraciət qəbul edilmədi.");
            }

            showAlert(alertBox, "Kredit müraciətiniz uğurla göndərildi və baxılmaq üçün qeydə alındı!", "success");
            form.reset();

            setTimeout(async () => {
                const modalEl = document.getElementById("applyLoanModal");
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();
                alertBox.classList.add("d-none");
                await loadLoans(token);
            }, 1200);

        } catch (err) {
            showAlert(alertBox, err.message, "danger");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-send me-1"></i> Müraciəti Göndər';
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
    renderActiveLoanCard(userLoans);
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

function formatDateShort(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    const months = ["Yan", "Fev", "Mar", "Apr", "May", "İyn", "İyl", "Avq", "Sen", "Okt", "Noy", "Dek"];
    const day = String(d.getDate()).padStart(2, '0');
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function showAlert(box, msg, type) {
    if (!box) return;
    box.className = `alert alert-${type} mb-3`;
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
        // Silent
    }
}
