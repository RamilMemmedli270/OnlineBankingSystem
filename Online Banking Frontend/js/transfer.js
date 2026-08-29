document.addEventListener("DOMContentLoaded", function () {
    const token = sessionStorage.getItem("token");

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // Role check
    const roles = JSON.parse(sessionStorage.getItem("roles") || "[]");
    const isAdmin = roles.includes("Admin");
    const isCustomer = roles.includes("Customer");

    // Hide customer-only sidebar links for Admin
    if (isAdmin) {
        const customerNavItems = [
            "navAccounts",
            "navTransfer",
            "navTransactions",
            "navLoans",
            "navNotifications",
            "navBalanceAlert"
        ];

        customerNavItems.forEach(id => {
            const navItem = document.getElementById(id);
            if (navItem) {
                navItem.style.display = "none";
            }
        });

        // Admins should not access customer pages
        if (!isCustomer) {
            window.location.href = "dashboard.html";
            return;
        }
    }

    loadAccounts();

    const transferForm = document.getElementById("transferForm");
    transferForm.addEventListener("submit", handleTransferSubmit);

    const fromAccountSelect = document.getElementById("fromAccountSelect");
    fromAccountSelect.addEventListener("change", function () {
        handleSourceAccountChange();
        populateToAccounts(fromAccountSelect.value);
        updateTransferSummary();
        validateForm();
    });

    // Segment toggle handlers
    const internalBtn = document.getElementById("transferTypeInternal");
    const externalBtn = document.getElementById("transferTypeExternal");
    const toAccountSelectWrapper = document.getElementById("toAccountSelectWrapper");
    const toAccountNumberWrapper = document.getElementById("toAccountNumberWrapper");

    if (internalBtn && externalBtn) {
        internalBtn.addEventListener("click", function() {
            internalBtn.classList.add("active");
            internalBtn.style.background = "#ffffff";
            internalBtn.style.color = "var(--primary-color)";
            internalBtn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";

            externalBtn.classList.remove("active");
            externalBtn.style.background = "transparent";
            externalBtn.style.color = "#64748b";
            externalBtn.style.boxShadow = "none";

            if (toAccountSelectWrapper) toAccountSelectWrapper.classList.remove("d-none");
            if (toAccountNumberWrapper) toAccountNumberWrapper.classList.add("d-none");
            
            updateTransferSummary();
            validateForm();
        });

        externalBtn.addEventListener("click", function() {
            externalBtn.classList.add("active");
            externalBtn.style.background = "#ffffff";
            externalBtn.style.color = "var(--primary-color)";
            externalBtn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";

            internalBtn.classList.remove("active");
            internalBtn.style.background = "transparent";
            internalBtn.style.color = "#64748b";
            internalBtn.style.boxShadow = "none";

            if (toAccountNumberWrapper) toAccountNumberWrapper.classList.remove("d-none");
            if (toAccountSelectWrapper) toAccountSelectWrapper.classList.add("d-none");
            
            updateTransferSummary();
            validateForm();
        });
    }

    // Quick amount button handler
    document.addEventListener("click", function(e) {
        if (e.target && e.target.classList.contains("quick-amount-btn")) {
            const val = e.target.getAttribute("data-value");
            const amountInput = document.getElementById("amount");
            if (amountInput) {
                amountInput.value = val;
                updateTransferSummary();
                validateForm();
            }
        }
    });

    // Add inputs change/input event listener to trigger updateTransferSummary and validateForm
    const inputsToWatch = ["fromAccountSelect", "toAccountSelect", "toAccountNumber", "amount", "description"];
    inputsToWatch.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("input", function() {
                updateTransferSummary();
                validateForm();
            });
            el.addEventListener("change", function() {
                updateTransferSummary();
                validateForm();
            });
        }
    });

    // Initial validation check
    validateForm();
});

let userAccounts = [];

async function loadAccounts() {
    const token = sessionStorage.getItem("token");
    const selectElement = document.getElementById("fromAccountSelect");

    selectElement.innerHTML =
        '<option value="" selected disabled>Hesab seçin...</option>';

    try {
        const response = await fetch(`${API_BASE_URL}/account`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = "index.html";
            return;
        }

        if (!response.ok) {
            throw new Error("Hesablar yüklənərkən xəta baş verdi");
        }

        userAccounts = await response.json();

        if (userAccounts.length === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "Hələ heç bir hesabınız yoxdur";
            opt.disabled = true;
            selectElement.appendChild(opt);
            return;
        }

        userAccounts.forEach(account => {
            const typeLabel = account.accountType === 0 ? "Əmanət" : "Cari";
            const maskedNumber = maskAccountNumber(account.accountNumber);

            const optionText =
                `${maskedNumber} - ${typeLabel} - ${account.balance.toFixed(2)} AZN`;

            const option = document.createElement("option");
            option.value = account.id;
            option.textContent = optionText;
            option.dataset.accountNumber = account.accountNumber;

            selectElement.appendChild(option);
        });

        const urlParams = new URLSearchParams(window.location.search);
        const fromParam = urlParams.get('from');
        if (fromParam) {
            selectElement.value = fromParam;
            selectElement.dispatchEvent(new Event("change"));
        }

    } catch (error) {
        showAlert(error.message, "danger");
    }
}

async function handleTransferSubmit(e) {
    e.preventDefault();

    hideAlert();

    const fromAccountSelect =
        document.getElementById("fromAccountSelect");

    const toAccountNumberInput =
        document.getElementById("toAccountNumber");

    const amountInput =
        document.getElementById("amount");

    const descriptionInput =
        document.getElementById("description");

    const fromAccountId = fromAccountSelect.value;
    const internalBtn = document.getElementById("transferTypeInternal");
    const isInternal = internalBtn ? internalBtn.classList.contains("active") : true;
    const toAccountSelect = document.getElementById("toAccountSelect");
    const toAccountNumber = isInternal ? (toAccountSelect ? toAccountSelect.value : "") : toAccountNumberInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();

    if (!fromAccountId) {
        showAlert("Göndərən hesabı seçin.", "danger");
        return;
    }

    if (!toAccountNumber) {
        if (isInternal) {
            showAlert("Hədəf hesabı seçin.", "danger");
        } else {
            showAlert("Alan hesab nömrəsini daxil edin.", "danger");
        }
        return;
    }

    if (isNaN(amount) || amount <= 0) {
        showAlert("Məbləğ 0-dan böyük olmalıdır.", "danger");
        return;
    }

    const selectedOption =
        fromAccountSelect.options[fromAccountSelect.selectedIndex];

    const fromAccountNumber =
        selectedOption ? selectedOption.dataset.accountNumber : "";

    if (
        fromAccountNumber &&
        fromAccountNumber.toUpperCase() ===
        toAccountNumber.toUpperCase()
    ) {
        showAlert(
            "Göndərən və alan hesab eyni ola bilməz.",
            "warning"
        );
        return;
    }

    const submitBtn = document.getElementById("submitBtn");
    const submitSpinner = document.getElementById("submitSpinner");

    submitBtn.disabled = true;
    submitSpinner.classList.remove("d-none");

    const token = sessionStorage.getItem("token");

    try {
        const response = await fetch(
            `${API_BASE_URL}/transaction/transfer`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    fromAccountId: parseInt(fromAccountId),
                    toAccountNumber: toAccountNumber,
                    amount: amount,
                    description: description || null
                })
            }
        );

        if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = "index.html";
            return;
        }

        let data = {};

        try {
            data = await response.json();
        } catch (err) {}

        if (!response.ok) {
            throw new Error(
                data.message || "Köçürmə zamanı xəta baş verdi."
            );
        }

        showAlert(
            "Köçürmə uğurla tamamlandı",
            "success"
        );

        document.getElementById("transferForm").reset();
        document.getElementById("sourceCardPreview").innerHTML = "";

        // Reset segment toggle styles, wrapper visibility and summary card
        const internalBtn = document.getElementById("transferTypeInternal");
        const externalBtn = document.getElementById("transferTypeExternal");
        const toAccountSelectWrapper = document.getElementById("toAccountSelectWrapper");
        const toAccountNumberWrapper = document.getElementById("toAccountNumberWrapper");
        const summaryWrapper = document.getElementById("transferSummary");

        if (internalBtn && externalBtn) {
            internalBtn.classList.add("active");
            internalBtn.style.background = "#ffffff";
            internalBtn.style.color = "var(--primary-color)";
            internalBtn.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";

            externalBtn.classList.remove("active");
            externalBtn.style.background = "transparent";
            externalBtn.style.color = "#64748b";
            externalBtn.style.boxShadow = "none";
        }

        if (toAccountSelectWrapper) toAccountSelectWrapper.classList.remove("d-none");
        if (toAccountNumberWrapper) toAccountNumberWrapper.classList.add("d-none");
        if (summaryWrapper) summaryWrapper.classList.add("d-none");

        await loadAccounts();

    } catch (error) {
        showAlert(error.message, "danger");

    } finally {
        submitBtn.disabled = false;
        submitSpinner.classList.add("d-none");
    }
}

function showAlert(message, type = "danger") {
    const alertBox = document.getElementById("alertBox");

    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove("d-none");
}

function hideAlert() {
    const alertBox = document.getElementById("alertBox");

    alertBox.classList.add("d-none");
    alertBox.className = "alert d-none";
}

function handleSourceAccountChange() {
    const fromAccountSelect = document.getElementById("fromAccountSelect");
    const accountId = fromAccountSelect.value;
    const previewContainer = document.getElementById("sourceCardPreview");

    if (!accountId) {
        previewContainer.innerHTML = "";
        return;
    }

    const account = userAccounts.find(a => a.id == accountId);
    if (!account) {
        previewContainer.innerHTML = "";
        return;
    }

    const typeLabel = account.accountType === 0 ? "Əmanət" : "Cari";
    const cardGradient = account.accountType === 0 
        ? "linear-gradient(135deg, #1e293b 0%, #4361ee 100%)" 
        : "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)";
    const maskedAccNumber = maskAccountNumber(account.accountNumber);

    previewContainer.innerHTML = `
        <div class="card shadow text-white border-0 position-relative overflow-hidden p-3" style="background: ${cardGradient}; border-radius: 12px; min-height: 120px; font-size: 0.9rem; transition: all 0.3s ease; box-shadow: 0 8px 16px rgba(0,0,0,0.1) !important;">
            <div class="position-absolute w-100 h-100" style="background: linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0)); top:0; left:0; pointer-events:none;"></div>
            <div class="d-flex justify-content-between align-items-start mb-2" style="position: relative; z-index: 2;">
                <span class="fw-bold">🏦 Online Banking</span>
                <span class="badge" style="background: rgba(255,255,255,0.25);">${typeLabel}</span>
            </div>
            <div class="mb-2" style="position: relative; z-index: 2;">
                <span class="font-monospace small opacity-75">${maskedAccNumber}</span>
            </div>
            <div class="d-flex justify-content-between align-items-end mt-auto" style="position: relative; z-index: 2;">
                <div>
                    <span class="small opacity-50 d-block" style="font-size: 0.7rem;">Mövcud Balans</span>
                    <span class="fw-bold" style="font-size: 1.1rem;">${account.balance.toFixed(2)} AZN</span>
                </div>
                <div class="d-flex" style="opacity: 0.65;">
                    <div style="width: 18px; height: 18px; background: rgba(255,255,255,0.3); border-radius: 50%; margin-right: -6px;"></div>
                    <div style="width: 18px; height: 18px; background: rgba(255,255,255,0.15); border-radius: 50%;"></div>
                </div>
            </div>
        </div>
    `;
}

function populateToAccounts(selectedFromId) {
    const toSelect = document.getElementById("toAccountSelect");
    if (!toSelect) return;
    toSelect.innerHTML = '<option value="" selected disabled>Hədəf hesabı seçin...</option>';
    
    userAccounts.forEach(account => {
        if (account.id.toString() !== selectedFromId.toString()) {
            const typeLabel = account.accountType === 0 ? "Əmanət" : "Cari";
            const maskedNum = maskAccountNumber(account.accountNumber);
            const option = document.createElement("option");
            option.value = account.accountNumber;
            option.textContent = `${maskedNum} - ${typeLabel} - ${account.balance.toFixed(2)} AZN`;
            toSelect.appendChild(option);
        }
    });
}

function updateTransferSummary() {
    const fromSelect = document.getElementById("fromAccountSelect");
    const toSelect = document.getElementById("toAccountSelect");
    const toInput = document.getElementById("toAccountNumber");
    const amountInput = document.getElementById("amount");
    const summaryWrapper = document.getElementById("transferSummary");
    const summaryText = document.getElementById("transferSummaryText");
    
    if (!fromSelect || !toSelect || !toInput || !amountInput || !summaryWrapper || !summaryText) return;
    
    const internalBtn = document.getElementById("transferTypeInternal");
    const isInternal = internalBtn ? internalBtn.classList.contains("active") : true;
    
    const fromId = fromSelect.value;
    const fromAccount = userAccounts.find(a => a.id.toString() === fromId.toString());
    
    const targetNumber = isInternal ? toSelect.value : toInput.value.trim();
    const amountVal = parseFloat(amountInput.value);
    
    if (!fromAccount || !targetNumber || isNaN(amountVal) || amountVal <= 0) {
        summaryWrapper.classList.add("d-none");
        return;
    }
    
    summaryWrapper.classList.remove("d-none");
    
    const fromLabel = fromAccount.accountType === 0 ? "Əmanət" : "Cari";
    const fromMasked = maskAccountNumber(fromAccount.accountNumber);
    
    let targetLabel = "";
    if (isInternal) {
        const targetAccount = userAccounts.find(a => a.accountNumber === targetNumber);
        if (targetAccount) {
            const tLabel = targetAccount.accountType === 0 ? "Əmanət" : "Cari";
            const tMasked = maskAccountNumber(targetAccount.accountNumber);
            targetLabel = `öz <strong>${tLabel} hesabınıza</strong> (${tMasked})`;
        } else {
            targetLabel = `nömrəli hesaba (${targetNumber})`;
        }
    } else {
        const displayTarget = targetNumber.length > 8 ? maskAccountNumber(targetNumber) : targetNumber;
        targetLabel = `<strong>${displayTarget}</strong> nömrəli kənar hesaba`;
    }
    
    summaryText.innerHTML = `Siz <strong>${fromLabel} hesabınızdan</strong> (${fromMasked}) alıcı ${targetLabel} <strong>${amountVal.toFixed(2)} AZN</strong> köçürürsünüz.`;
}

function validateForm() {
    const fromSelect = document.getElementById("fromAccountSelect");
    const toSelect = document.getElementById("toAccountSelect");
    const toInput = document.getElementById("toAccountNumber");
    const amountInput = document.getElementById("amount");
    const submitBtn = document.getElementById("submitBtn");

    if (!fromSelect || !toSelect || !toInput || !amountInput || !submitBtn) return;

    const internalBtn = document.getElementById("transferTypeInternal");
    const isInternal = internalBtn ? internalBtn.classList.contains("active") : true;

    const fromId = fromSelect.value;
    const fromAccount = userAccounts.find(a => a.id.toString() === fromId.toString());

    const targetNumber = isInternal ? toSelect.value : toInput.value.trim();
    const amountVal = parseFloat(amountInput.value);

    let isValid = true;
    let errorMessage = "";

    // 1. Hədəf hesab seçilməyibsə və ya boşdursa, düymə deaktiv olmalıdır
    if (!fromId || !targetNumber) {
        isValid = false;
    }
    // 2. Məbləğ mənfi və ya 0-dırsa
    else if (isNaN(amountVal) || amountVal <= 0) {
        isValid = false;
    }
    // 3. Məbləğ balansdan çoxdursa
    else if (fromAccount && amountVal > fromAccount.balance) {
        isValid = false;
        errorMessage = `Kifayət qədər balans yoxdur. Mövcud balans: ${fromAccount.balance.toFixed(2)} AZN`;
    }
    // 4. Göndərən və alan hesab eyni ola bilməz
    else if (fromAccount && fromAccount.accountNumber.toUpperCase() === targetNumber.toUpperCase()) {
        isValid = false;
        errorMessage = "Göndərən və alan hesab eyni ola bilməz.";
    }

    if (isValid) {
        submitBtn.disabled = false;
        hideAlert();
    } else {
        submitBtn.disabled = true;
        if (errorMessage) {
            showAlert(errorMessage, "danger");
        } else {
            // Only hide alert if it was displaying a validation warning (not database error)
            const alertBox = document.getElementById("alertBox");
            if (alertBox && !alertBox.classList.contains("d-none") && 
                (alertBox.textContent.includes("balans yoxdur") || alertBox.textContent.includes("eyni ola bilməz"))) {
                hideAlert();
            }
        }
    }
}
