let allLoans = [];

document.addEventListener("DOMContentLoaded", function () {
    const token = sessionStorage.getItem("token");

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // --- Admin üçün sidebar məhdudiyyəti və direct URL girişindən qorunma ---
    const roles = JSON.parse(sessionStorage.getItem("roles") || "[]");

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

    loadLoans();

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            filterAndRenderLoans();
        });
    }

    document.getElementById("loanApplicationForm").addEventListener("submit", handleSubmit);
});

async function handleSubmit(e) {
    e.preventDefault();

    const token = sessionStorage.getItem("token");
    const formAlertBox = document.getElementById("formAlertBox");
    const submitBtn = document.getElementById("submitBtn");

    const amount = parseFloat(document.getElementById("amount").value);
    const term = parseInt(document.getElementById("term").value, 10);
    const reason = document.getElementById("reason").value.trim();

    formAlertBox.classList.add("d-none");

    if (!amount || amount <= 0) {
        showFormAlert("Məbləğ 0-dan böyük olmalıdır.", "danger");
        return;
    }

    if (!term || term <= 0) {
        showFormAlert("Müddət 0-dan böyük olmalıdır.", "danger");
        return;
    }

    if (!reason) {
        showFormAlert("Səbəb boş ola bilməz.", "danger");
        return;
    }

    submitBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/loanapplication`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ amount, term, reason })
        });

        if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = "index.html";
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Müraciət göndərilərkən xəta baş verdi");
        }

        showFormAlert("Kredit müraciətiniz uğurla göndərildi", "success");
        document.getElementById("loanApplicationForm").reset();
        loadLoans();

    } catch (error) {
        showFormAlert(error.message, "danger");
    } finally {
        submitBtn.disabled = false;
    }
}

async function loadLoans() {
    const token = sessionStorage.getItem("token");
    const container = document.getElementById("loansContainer");
    const emptyState = document.getElementById("emptyState");
    const loadingState = document.getElementById("loadingState");
    const listAlertBox = document.getElementById("listAlertBox");

    listAlertBox.classList.add("d-none");
    container.classList.add("d-none");
    emptyState.classList.add("d-none");
    loadingState.classList.remove("d-none");
    container.innerHTML = "";

    try {
        const response = await fetch(`${API_BASE_URL}/loanapplication/my`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = "index.html";
            return;
        }

        if (!response.ok) {
            let errorData = {};
            try {
                errorData = await response.json();
            } catch (err) {}
            throw new Error(errorData.message || "Məlumatları yükləmək mümkün olmadı.");
        }

        const loans = await response.json();
        allLoans = loans;
        filterAndRenderLoans();

    } catch (error) {
        loadingState.classList.add("d-none");
        listAlertBox.textContent = error.message;
        listAlertBox.classList.remove("d-none");
    }
}

function getStatusInfo(status) {
    const statusMap = {
        0: { label: "Gözləmədə", badgeStyle: "background: rgba(245, 158, 11, 0.08); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.15); font-weight: 600; font-size: 0.75rem; border-radius: 8px;" },
        1: { label: "Təsdiqləndi", badgeStyle: "background: rgba(16, 185, 129, 0.08); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.15); font-weight: 600; font-size: 0.75rem; border-radius: 8px;" },
        2: { label: "İmtina edildi", badgeStyle: "background: rgba(239, 68, 68, 0.08); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.15); font-weight: 600; font-size: 0.75rem; border-radius: 8px;" },
        "Pending": { label: "Gözləmədə", badgeStyle: "background: rgba(245, 158, 11, 0.08); color: #d97706; border: 1px solid rgba(245, 158, 11, 0.15); font-weight: 600; font-size: 0.75rem; border-radius: 8px;" },
        "Approved": { label: "Təsdiqləndi", badgeStyle: "background: rgba(16, 185, 129, 0.08); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.15); font-weight: 600; font-size: 0.75rem; border-radius: 8px;" },
        "Declined": { label: "İmtina edildi", badgeStyle: "background: rgba(239, 68, 68, 0.08); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.15); font-weight: 600; font-size: 0.75rem; border-radius: 8px;" }
    };

    return statusMap[status] || { label: String(status), badgeStyle: "background: rgba(108, 117, 125, 0.08); color: #6c757d; border: 1px solid rgba(108, 117, 125, 0.15); font-weight: 600; font-size: 0.75rem; border-radius: 8px;" };
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

function showFormAlert(message, type) {
    const formAlertBox = document.getElementById("formAlertBox");
    formAlertBox.textContent = message;
    formAlertBox.className = `alert alert-${type}`;
    formAlertBox.classList.remove("d-none");
    
    // Auto-scroll to alert
    formAlertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function filterAndRenderLoans() {
    const searchInput = document.getElementById("searchInput");
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";

    let filtered = allLoans;

    if (query) {
        filtered = filtered.filter(loan => {
            const reason = (loan.reason || "").toLowerCase();
            const amount = String(loan.amount || "");
            const term = String(loan.term || "");
            return reason.includes(query) ||
                   amount.includes(query) ||
                   term.includes(query);
        });
    }

    renderLoansList(filtered);
}

function renderLoansList(loans) {
    const container = document.getElementById("loansContainer");
    const emptyState = document.getElementById("emptyState");
    const loadingState = document.getElementById("loadingState");

    container.innerHTML = "";
    loadingState.classList.add("d-none");

    if (!loans || loans.length === 0) {
        container.classList.add("d-none");
        emptyState.classList.remove("d-none");
        return;
    }

    emptyState.classList.add("d-none");
    container.classList.remove("d-none");

    loans.forEach(loan => {
        const statusInfo = getStatusInfo(loan.status);
        const formattedDate = formatDate(loan.createdAt);

        let reviewedInfo = "";
        if (loan.reviewedAt || loan.reviewedBy) {
            reviewedInfo += `
                <div class="border-top border-dashed pt-3 mt-3" style="border-top: 1.5px dashed var(--border-color) !important;">
            `;
            if (loan.reviewedAt) {
                reviewedInfo += `
                    <div class="d-flex justify-content-between mb-1">
                        <span class="text-muted small">Baxılma Tarixi:</span>
                        <span class="small fw-semibold text-dark">${formatDate(loan.reviewedAt)}</span>
                    </div>
                `;
            }
            if (loan.reviewedBy) {
                reviewedInfo += `
                    <div class="d-flex justify-content-between">
                        <span class="text-muted small">Baxan Menecer:</span>
                        <span class="small fw-semibold text-dark">${escapeHtml(loan.reviewedBy)}</span>
                    </div>
                `;
            }
            reviewedInfo += `</div>`;
        }

        const card = document.createElement("div");
        card.className = "col-md-6 col-lg-4 mb-4";
        card.innerHTML = `
            <div class="card border-0 shadow-sm h-100" style="border-radius: 16px; transition: transform 0.2s, box-shadow 0.2s;">
                <div class="card-body p-4 d-flex flex-column justify-content-between">
                    <div>
                        <!-- Header status badge -->
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <span class="badge py-2 px-3" style="${statusInfo.badgeStyle}">${statusInfo.label}</span>
                            <span class="text-muted" style="font-size: 0.8rem;"><i class="bi bi-clock"></i> ${loan.term} ay</span>
                        </div>
                        
                        <!-- Amount -->
                        <div class="mb-3">
                            <span class="text-muted small d-block">Müraciət Məbləği</span>
                            <span class="fw-bold text-primary" style="font-size: 1.5rem;">${loan.amount.toFixed(2)} AZN</span>
                        </div>

                        <!-- Reason and Date -->
                        <div class="d-flex flex-column gap-2" style="font-size: 0.88rem;">
                            <div class="d-flex align-items-start gap-2">
                                <span class="text-muted mt-0.5"><i class="bi bi-chat-left-quote"></i></span>
                                <div>
                                    <span class="text-muted small d-block">Kreditin Məqsədi</span>
                                    <span class="text-dark fw-medium">${escapeHtml(loan.reason)}</span>
                                </div>
                            </div>
                            <div class="d-flex align-items-start gap-2 mt-2">
                                <span class="text-muted mt-0.5"><i class="bi bi-calendar-event"></i></span>
                                <div>
                                    <span class="text-muted small d-block">Müraciət Tarixi</span>
                                    <span class="text-dark fw-medium">${formattedDate}</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Review Info -->
                        ${reviewedInfo}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}
