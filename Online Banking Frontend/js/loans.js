document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    loadLoans();

    document.getElementById("loanApplicationForm").addEventListener("submit", handleSubmit);
});

async function handleSubmit(e) {
    e.preventDefault();

    const token = localStorage.getItem("token");
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
            localStorage.clear();
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
    const token = localStorage.getItem("token");
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
            localStorage.clear();
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
        loadingState.classList.add("d-none");

        if (loans.length === 0) {
            emptyState.classList.remove("d-none");
            return;
        }

        container.classList.remove("d-none");

        loans.forEach(loan => {
            const statusInfo = getStatusInfo(loan.status);
            const formattedDate = formatDate(loan.createdAt);

            let reviewedInfo = "";
            if (loan.reviewedAt) {
                reviewedInfo += `<p class="text-muted mb-1 small">Baxılma tarixi</p>
                    <p class="mb-2">${formatDate(loan.reviewedAt)}</p>`;
            }
            if (loan.reviewedBy) {
                reviewedInfo += `<p class="text-muted mb-1 small">Baxlayan</p>
                    <p class="mb-0">${loan.reviewedBy}</p>`;
            }

            const card = document.createElement("div");
            card.className = "col-md-6 col-lg-4";
            card.innerHTML = `
                <div class="card account-card shadow-sm h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="badge ${statusInfo.badgeClass}">${statusInfo.label}</span>
                        </div>
                        <p class="text-muted mb-1 small">Məbləğ</p>
                        <p class="fw-bold text-primary mb-2">${loan.amount.toFixed(2)} AZN</p>
                        <p class="text-muted mb-1 small">Müddət</p>
                        <p class="mb-2">${loan.term} ay</p>
                        <p class="text-muted mb-1 small">Səbəb</p>
                        <p class="mb-2">${escapeHtml(loan.reason)}</p>
                        <p class="text-muted mb-1 small">Müraciət tarixi</p>
                        <p class="mb-2">${formattedDate}</p>
                        ${reviewedInfo}
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        loadingState.classList.add("d-none");
        listAlertBox.textContent = error.message;
        listAlertBox.classList.remove("d-none");
    }
}

function getStatusInfo(status) {
    const statusMap = {
        0: { label: "Pending", badgeClass: "bg-warning text-dark" },
        1: { label: "Approved", badgeClass: "bg-success" },
        2: { label: "Declined", badgeClass: "bg-danger" },
        "Pending": { label: "Pending", badgeClass: "bg-warning text-dark" },
        "Approved": { label: "Approved", badgeClass: "bg-success" },
        "Declined": { label: "Declined", badgeClass: "bg-danger" }
    };

    return statusMap[status] || { label: String(status), badgeClass: "bg-secondary" };
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

function showFormAlert(message, type) {
    const formAlertBox = document.getElementById("formAlertBox");
    formAlertBox.textContent = message;
    formAlertBox.className = `alert alert-${type}`;
    formAlertBox.classList.remove("d-none");
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}
