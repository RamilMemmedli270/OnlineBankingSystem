document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // Role check
    const roles = JSON.parse(localStorage.getItem("roles") || "[]");
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
});

let userAccounts = [];

async function loadAccounts() {
    const token = localStorage.getItem("token");
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
            localStorage.clear();
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
            const typeLabel =
                account.accountType === 0 ? "Əmanət" : "Cari";

            const optionText =
                `${account.accountNumber} - ${typeLabel} - ${account.balance.toFixed(2)} AZN`;

            const option = document.createElement("option");
            option.value = account.id;
            option.textContent = optionText;
            option.dataset.accountNumber = account.accountNumber;

            selectElement.appendChild(option);
        });

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
    const toAccountNumber = toAccountNumberInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();

    if (!fromAccountId) {
        showAlert("Göndərən hesabı seçin.", "danger");
        return;
    }

    if (!toAccountNumber) {
        showAlert("Alan hesab nömrəsini daxil edin.", "danger");
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

    const token = localStorage.getItem("token");

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
            localStorage.clear();
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