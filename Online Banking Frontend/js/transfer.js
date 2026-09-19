// ==========================================================================
// ONLINEBANK — TRANSFER CONTROLLER (transfer.js)
// F3: Internal and External transfers, live balance checks, confirmation & receipt
// ==========================================================================

let userAccounts = [];
let isInternal = true;
let isBalanceHidden = false;
let pendingTransferPayload = null;

document.addEventListener("DOMContentLoaded", async function () {
    const token = getAuthToken();

    // 1. Auth Guard
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // 2. Setup Profile, Date & Logout
    setupUserProfile();
    setupCurrentDate();
    setupLogoutHandlers();

    // 3. Eye Toggle for Balance
    const eyeBtn = document.getElementById("toggleBalanceVisibilityBtn");
    if (eyeBtn) {
        eyeBtn.addEventListener("click", toggleBalanceVisibility);
    }

    // 4. Tab Mode Switcher (Internal vs External)
    setupTabs();

    // 5. Account Selection & Quick Amount Handlers
    setupFormInputs();

    // 6. Submit Handlers (Preview & Execution)
    setupTransferActions(token);

    // 7. Load Dynamic Accounts & Recent Transfers
    await loadAccountsAndTransfers(token);

    // 8. Notifications check
    loadUnreadNotifications(token);
});

// --- Profile & Greetings ---
function setupUserProfile() {
    const fullName = getAuthFullName();
    const roles = getAuthRoles();
    const isAdmin = roles.includes("Admin");
    const avatarLetter = fullName.charAt(0).toUpperCase();

    const nameEl = document.getElementById("userFullName");
    const roleEl = document.getElementById("userRole");
    const avatarEl = document.getElementById("userAvatar");
    const adminNav = document.getElementById("adminNavWrapper");
    const previewHolder = document.getElementById("previewCardHolder");

    if (nameEl) nameEl.textContent = fullName;
    if (roleEl) roleEl.textContent = isAdmin ? "Administrator" : "Müştəri";
    if (avatarEl) avatarEl.textContent = avatarLetter;
    if (previewHolder) previewHolder.textContent = fullName.toUpperCase();

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

// --- Tabs Switcher (Internal vs External) ---
function setupTabs() {
    const tabInternal = document.getElementById("tabInternalBtn");
    const tabExternal = document.getElementById("tabExternalBtn");
    const internalGroup = document.getElementById("internalRecipientGroup");
    const externalGroup = document.getElementById("externalRecipientGroup");
    const toAccountInternal = document.getElementById("toAccountSelectInternal");
    const toAccountExternal = document.getElementById("toAccountNumberInput");

    tabInternal.addEventListener("click", function () {
        isInternal = true;
        tabInternal.classList.add("active");
        tabExternal.classList.remove("active");

        internalGroup.classList.remove("d-none");
        externalGroup.classList.add("d-none");

        toAccountInternal.setAttribute("required", "required");
        toAccountExternal.removeAttribute("required");
        toAccountExternal.value = "";
    });

    tabExternal.addEventListener("click", function () {
        isInternal = false;
        tabExternal.classList.add("active");
        tabInternal.classList.remove("active");

        internalGroup.classList.add("d-none");
        externalGroup.classList.remove("d-none");

        toAccountExternal.setAttribute("required", "required");
        toAccountInternal.removeAttribute("required");
        toAccountInternal.value = "";
    });
}

// --- Dynamic Form Inputs & Live Validation ---
function setupFormInputs() {
    const fromSelect = document.getElementById("fromAccountSelect");
    const amountInput = document.getElementById("transferAmountInput");
    const quickPills = document.querySelectorAll(".quick-amt-pill");
    const externalInput = document.getElementById("toAccountNumberInput");

    // Sender Account Change
    fromSelect.addEventListener("change", function () {
        const selectedId = parseInt(this.value);
        const selectedAcc = userAccounts.find(a => a.id === selectedId);

        if (selectedAcc) {
            updateSenderAccountUI(selectedAcc);
            populateInternalRecipientSelect(selectedId);
            validateAmount();
        }
    });

    // Amount Input Change
    amountInput.addEventListener("input", function () {
        validateAmount();
    });

    // Quick Amount Pills
    quickPills.forEach(pill => {
        pill.addEventListener("click", function () {
            const amtType = this.dataset.amount;
            const selectedAcc = getSelectedSenderAccount();

            if (amtType === "max") {
                if (selectedAcc) {
                    amountInput.value = Math.max(0, Number(selectedAcc.balance) || 0).toFixed(2);
                }
            } else {
                amountInput.value = parseFloat(amtType).toFixed(2);
            }

            // Highlight pill
            quickPills.forEach(p => p.classList.remove("active"));
            this.classList.add("active");

            validateAmount();
        });
    });

    // 16-Digit Formatting for External Account Number
    if (externalInput) {
        externalInput.addEventListener("input", function (e) {
            let val = e.target.value.replace(/\D/g, ""); // digits only
            if (val.length > 16) val = val.slice(0, 16);
            // Format 0000 0000 0000 0000
            const parts = [];
            for (let i = 0; i < val.length; i += 4) {
                parts.push(val.slice(i, i + 4));
            }
            e.target.value = parts.join(" ");
        });
    }
}

function getSelectedSenderAccount() {
    const fromSelect = document.getElementById("fromAccountSelect");
    const selectedId = parseInt(fromSelect.value);
    return userAccounts.find(a => a.id === selectedId);
}

function updateSenderAccountUI(acc) {
    const balDisplay = document.getElementById("fromAccountBalanceDisplay");
    const previewNumber = document.getElementById("previewCardNumber");
    const previewBal = document.getElementById("previewCardBalance");
    const cardStatus = document.getElementById("cardStatusBadge");

    const balFormatted = formatMoney(acc.balance);

    if (balDisplay) {
        balDisplay.textContent = isBalanceHidden ? "••••••" : `${balFormatted} ₼`;
        balDisplay.dataset.realAmount = acc.balance;
    }

    if (previewNumber) {
        const num = acc.accountNumber || "";
        if (num.length >= 12) {
            previewNumber.textContent = `${num.slice(0, 4)} •••• •••• ${num.slice(-4)}`;
        } else {
            previewNumber.textContent = `4169 •••• •••• ${String(acc.id).padStart(4, '0')}`;
        }
    }

    if (previewBal) {
        previewBal.textContent = isBalanceHidden ? "••••••" : `${balFormatted} ₼`;
    }

    if (cardStatus) {
        if (acc.status === 1) { // 1 = Frozen
            cardStatus.textContent = "Dondurulub";
            cardStatus.className = "badge bg-danger-subtle text-danger small px-2 py-1";
        } else {
            cardStatus.textContent = "Aktiv";
            cardStatus.className = "badge bg-success-subtle text-success small px-2 py-1";
        }
    }
}

function populateInternalRecipientSelect(excludeAccountId) {
    const toSelect = document.getElementById("toAccountSelectInternal");
    if (!toSelect) return;

    toSelect.innerHTML = '<option value="" disabled selected>Mədaxil hesabı seçin...</option>';

    const eligible = userAccounts.filter(a => a.id !== excludeAccountId && a.status === 0);
    if (eligible.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.disabled = true;
        opt.textContent = "Köçürmə edə biləcəyiniz başqa aktiv hesabınız yoxdur";
        toSelect.appendChild(opt);
        return;
    }

    eligible.forEach(acc => {
        const typeName = acc.accountType === 0 ? "Əmanət" : "Cari";
        const num = acc.accountNumber ? acc.accountNumber.slice(-4) : acc.id;
        const opt = document.createElement("option");
        opt.value = acc.accountNumber;
        opt.dataset.accountId = acc.id;
        opt.textContent = `${typeName} Hesab (*${num}) — Qalıq: ${formatMoney(acc.balance)} ₼`;
        toSelect.appendChild(opt);
    });
}

function validateAmount() {
    const amountInput = document.getElementById("transferAmountInput");
    const summaryDebit = document.getElementById("summaryDebitAmount");
    const errorBox = document.getElementById("amountValidationError");
    const errorText = document.getElementById("amountErrorText");
    const submitBtn = document.getElementById("btnPreviewTransfer");

    const amount = parseFloat(amountInput.value);
    const selectedAcc = getSelectedSenderAccount();

    if (isNaN(amount) || amount <= 0) {
        if (summaryDebit) summaryDebit.textContent = "0.00 ₼";
        if (errorBox) errorBox.classList.add("d-none");
        submitBtn.disabled = false;
        return true;
    }

    const availBal = selectedAcc ? (Number(selectedAcc.balance) || 0) : 0;
    if (summaryDebit) summaryDebit.textContent = `${formatMoney(amount)} ₼`;

    if (selectedAcc && selectedAcc.status === 1) {
        errorText.textContent = "Bu hesab dondurulub! Əməliyyat apara bilməzsiniz.";
        errorBox.classList.remove("d-none");
        submitBtn.disabled = true;
        return false;
    }

    if (amount > availBal) {
        errorText.textContent = `Balansınız kifayət etmir! Mövcud balans: ${formatMoney(availBal)} ₼`;
        errorBox.classList.remove("d-none");
        submitBtn.disabled = true;
        return false;
    }

    errorBox.classList.add("d-none");
    submitBtn.disabled = false;
    return true;
}

// --- Toggle Balance Visibility Eye ---
function toggleBalanceVisibility() {
    isBalanceHidden = !isBalanceHidden;
    const icon = document.getElementById("toggleEyeIcon");
    if (icon) {
        icon.className = isBalanceHidden ? "bi bi-eye-slash" : "bi bi-eye";
    }

    const selectedAcc = getSelectedSenderAccount();
    if (selectedAcc) {
        updateSenderAccountUI(selectedAcc);
    }
}

// --- Load Accounts and Recent Transfers ---
async function loadAccountsAndTransfers(token) {
    try {
        const accRes = await fetch(`${API_BASE_URL}/account`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!accRes.ok) {
            if (accRes.status === 401) {
                clearAuth();
                window.location.href = "index.html";
                return;
            }
            throw new Error("Hesablar alına bilmədi.");
        }

        userAccounts = await accRes.json();
        populateFromAccountSelect(userAccounts);

        // Load Recent Transfers
        await loadRecentTransfers(token, userAccounts);

    } catch (err) {
        console.error("Məlumat yükləmə xətası:", err);
    }
}

function populateFromAccountSelect(accounts) {
    const fromSelect = document.getElementById("fromAccountSelect");
    if (!fromSelect) return;

    fromSelect.innerHTML = '<option value="" disabled selected>Hesab seçin...</option>';

    if (!accounts || accounts.length === 0) {
        const opt = document.createElement("option");
        opt.disabled = true;
        opt.textContent = "Heç bir aktiv bank hesabınız yoxdur";
        fromSelect.appendChild(opt);
        return;
    }

    accounts.forEach(acc => {
        const typeName = acc.accountType === 0 ? "Əmanət" : "Cari";
        const num = acc.accountNumber ? acc.accountNumber.slice(-4) : acc.id;
        const isFrozen = acc.status === 1;
        const opt = document.createElement("option");
        opt.value = acc.id;
        opt.textContent = `${typeName} Hesab (*${num}) — Qalıq: ${formatMoney(acc.balance)} ₼ ${isFrozen ? '[Dondurulub]' : ''}`;
        if (isFrozen) {
            opt.classList.add("text-danger");
        }
        fromSelect.appendChild(opt);
    });

    // Auto-select first active account
    const firstActive = accounts.find(a => a.status === 0) || accounts[0];
    if (firstActive) {
        fromSelect.value = firstActive.id;
        updateSenderAccountUI(firstActive);
        populateInternalRecipientSelect(firstActive.id);
    }
}

async function loadRecentTransfers(token, accounts) {
    const container = document.getElementById("recentTransfersMiniList");
    if (!container) return;

    if (!accounts || accounts.length === 0) {
        container.innerHTML = '<p class="text-muted small py-2 text-center">Hesab tapılmadı.</p>';
        return;
    }

    try {
        const txPromises = accounts.map(acc => 
            fetch(`${API_BASE_URL}/transaction/account/${acc.id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            })
            .then(r => r.ok ? r.json() : [])
            .catch(() => [])
        );

        const results = await Promise.all(txPromises);
        const allTx = results.flat();

        // Filter transfers only (transactionType === 0 in C# enum)
        const transfers = allTx.filter(t => t && (t.transactionType === 0 || t.transactionType === "Transfer" || t.transactionType === 2));
        transfers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (transfers.length === 0) {
            container.innerHTML = '<p class="text-muted small py-3 text-center">Hələlik heç bir köçürməniz qeydə alınmayıb.</p>';
            return;
        }

        container.innerHTML = "";
        const top3 = transfers.slice(0, 3);
        top3.forEach(t => {
            const item = document.createElement("div");
            item.className = "d-flex align-items-center justify-content-between py-2 border-bottom border-secondary border-opacity-25";
            item.innerHTML = `
                <div class="d-flex align-items-center gap-2">
                    <div class="tx-icon-circle transfer" style="width: 30px; height: 30px; font-size: 0.8rem;">
                        <i class="bi bi-arrow-left-right"></i>
                    </div>
                    <div>
                        <div class="small fw-bold text-white">${escapeHtml(t.description || "Pul Köçürməsi")}</div>
                        <div class="text-muted" style="font-size: 0.72rem;">${formatDate(t.createdAt)}</div>
                    </div>
                </div>
                <div class="text-end font-monospace">
                    <div class="small fw-bold text-white">- ${formatMoney(t.amount)} ₼</div>
                    <span class="badge bg-success-subtle text-success" style="font-size: 0.65rem;">Uğurlu</span>
                </div>
            `;
            container.appendChild(item);
        });

    } catch (e) {
        container.innerHTML = '<p class="text-muted small py-2 text-center">Tarixçə alına bilmədi.</p>';
    }
}

// --- Transfer Action & Modal Triggers ---
function setupTransferActions(token) {
    const form = document.getElementById("transferForm");
    const confirmModalEl = document.getElementById("confirmTransferModal");
    const confirmModal = new bootstrap.Modal(confirmModalEl);
    const executeBtn = document.getElementById("executeTransferBtn");
    const errorAlert = document.getElementById("transferErrorAlert");

    const receiptModalEl = document.getElementById("receiptModal");
    const receiptModal = new bootstrap.Modal(receiptModalEl);
    const receiptDoneBtn = document.getElementById("receiptDoneBtn");

    // Form Submit -> Validate & Open Confirmation Modal
    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const fromAcc = getSelectedSenderAccount();
        if (!fromAcc) {
            alert("Zəhmət olmasa göndərən hesabı seçin.");
            return;
        }

        if (fromAcc.status === 1) {
            alert("Seçilmiş hesab dondurulub! Köçürmə aparıla bilməz.");
            return;
        }

        let toAccountNumber = "";
        let toDisplayLabel = "";

        if (isInternal) {
            const toSelect = document.getElementById("toAccountSelectInternal");
            toAccountNumber = toSelect.value;
            toDisplayLabel = toSelect.options[toSelect.selectedIndex]?.text || toAccountNumber;
            if (!toAccountNumber) {
                alert("Zəhmət olmasa alan hesabı seçin.");
                return;
            }
        } else {
            const externalInput = document.getElementById("toAccountNumberInput");
            toAccountNumber = externalInput.value.replace(/\s+/g, "").trim();
            toDisplayLabel = `Hesab #${toAccountNumber}`;
            if (!toAccountNumber || toAccountNumber.length < 10) {
                alert("Zəhmət olmasa alan şəxsin düzgün hesab nömrəsini daxil edin.");
                return;
            }
            if (toAccountNumber === fromAcc.accountNumber) {
                alert("Eyni hesaba köçürmə edə bilməzsiniz! Başqa hesab seçin.");
                return;
            }
        }

        const amount = parseFloat(document.getElementById("transferAmountInput").value);
        if (isNaN(amount) || amount <= 0) {
            alert("Məbləğ 0-dan böyük olmalıdır.");
            return;
        }

        if (amount > (Number(fromAcc.balance) || 0)) {
            alert("Balansınız kifayət etmir!");
            return;
        }

        const description = document.getElementById("transferDescriptionInput").value.trim() || 
            (isInternal ? "Hesablararası Daxili Köçürmə" : "Müştəriyə Pul Köçürməsi");

        // Save payload for execution
        pendingTransferPayload = {
            fromAccountId: fromAcc.id,
            fromAccountNumber: fromAcc.accountNumber,
            toAccountNumber: toAccountNumber,
            amount: amount,
            description: description,
            isInternal: isInternal
        };

        // Populate Confirmation Modal
        document.getElementById("confirmFromAccount").textContent = `${fromAcc.accountType === 0 ? 'Əmanət' : 'Cari'} (*${fromAcc.accountNumber.slice(-4)})`;
        document.getElementById("confirmToAccount").textContent = toDisplayLabel;
        document.getElementById("confirmTransferType").textContent = isInternal ? "Öz Hesablarım Arasında (Daxili)" : "Başqa Müştəriyə (Xarici)";
        document.getElementById("confirmDescription").textContent = description;
        document.getElementById("confirmAmount").textContent = `${formatMoney(amount)} ₼`;
        document.getElementById("confirmTotalDebit").textContent = `${formatMoney(amount)} ₼`;

        errorAlert.classList.add("d-none");
        confirmModal.show();
    });

    // Execute Button Click inside Confirmation Modal
    executeBtn.addEventListener("click", async function () {
        if (!pendingTransferPayload) return;

        executeBtn.disabled = true;
        executeBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>İcra olunur...';
        errorAlert.classList.add("d-none");

        try {
            const res = await fetch(`${API_BASE_URL}/transaction/transfer`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    fromAccountId: pendingTransferPayload.fromAccountId,
                    toAccountNumber: pendingTransferPayload.toAccountNumber,
                    amount: pendingTransferPayload.amount,
                    description: pendingTransferPayload.description
                })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || "Köçürmə əməliyyatı baş tutmadı.");
            }

            const txResult = await res.json();

            // Hide confirmation modal
            confirmModal.hide();

            // Populate Digital Receipt Modal
            document.getElementById("receiptTxId").textContent = `#TX-${txResult.id || String(Date.now()).slice(-6)}`;
            document.getElementById("receiptAmount").textContent = `${formatMoney(pendingTransferPayload.amount)} ₼`;
            document.getElementById("receiptFromAccount").textContent = pendingTransferPayload.fromAccountNumber || `Hesab #${pendingTransferPayload.fromAccountId}`;
            document.getElementById("receiptToAccount").textContent = pendingTransferPayload.toAccountNumber;
            document.getElementById("receiptDate").textContent = formatDate(txResult.createdAt || new Date().toISOString());
            document.getElementById("receiptNewBalance").textContent = `${formatMoney(txResult.fromBalanceSnapshot ?? 0)} ₼`;

            // Reset form
            form.reset();
            document.getElementById("summaryDebitAmount").textContent = "0.00 ₼";

            // Show Receipt Modal
            receiptModal.show();

            // Reload fresh accounts and transactions
            await loadAccountsAndTransfers(token);

        } catch (err) {
            errorAlert.textContent = err.message;
            errorAlert.classList.remove("d-none");
        } finally {
            executeBtn.disabled = false;
            executeBtn.innerHTML = '<i class="bi bi-check2-circle"></i> Təsdiq et və Göndər';
        }
    });

    // Receipt Close / New Transfer Button
    receiptDoneBtn.addEventListener("click", function () {
        receiptModal.hide();
        pendingTransferPayload = null;
    });
}

// --- Formatters & Helpers ---
function formatMoney(val) {
    return Number(val || 0).toLocaleString('az-AZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatDate(isoString) {
    if (!isoString) return "-";
    const d = typeof parseUtcDate === "function" ? parseUtcDate(isoString) : new Date(isoString);
    if (!d || isNaN(d.getTime())) return "-";
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hour}:${min}`;
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
        // Silently catch notification errors
    }
}
