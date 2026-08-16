document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");

    // Redirect to index.html if token doesn't exist
    if (!token) {
        window.location.href = "index.html";
        return;
    }

    // Load accounts on page load
    loadAccounts();

    // Bind submit event to transfer form
    const transferForm = document.getElementById("transferForm");
    transferForm.addEventListener("submit", handleTransferSubmit);
});

// Store user accounts globally to check numbers during validation
let userAccounts = [];

/**
 * Loads user accounts from the API and populates the dropdown
 */
async function loadAccounts() {
    const token = localStorage.getItem("token");
    const selectElement = document.getElementById("fromAccountSelect");
    
    // Clear dropdown and set default option
    selectElement.innerHTML = '<option value="" selected disabled>Hesab seçin...</option>';

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
            // Mapping Account Types: 0 = Savings (Əmanət), 1 = Current (Cari)
            const typeLabel = account.accountType === 0 ? "Əmanət" : "Cari";
            
            // Format option text exactly as: account number - account type - balance currency
            const optionText = `${account.accountNumber} - ${typeLabel} - ${account.balance.toFixed(2)} AZN`;

            const option = document.createElement("option");
            option.value = account.id;
            option.textContent = optionText;
            
            // Store accountNumber in data attribute to use in validation
            option.dataset.accountNumber = account.accountNumber;

            selectElement.appendChild(option);
        });

    } catch (error) {
        showAlert(error.message, "danger");
    }
}

/**
 * Submits the transfer request
 */
async function handleTransferSubmit(e) {
    e.preventDefault();

    // Clear previous alerts
    hideAlert();

    const fromAccountSelect = document.getElementById("fromAccountSelect");
    const toAccountNumberInput = document.getElementById("toAccountNumber");
    const amountInput = document.getElementById("amount");
    const descriptionInput = document.getElementById("description");

    const fromAccountId = fromAccountSelect.value;
    const toAccountNumber = toAccountNumberInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const description = descriptionInput.value.trim();

    // --- Validation Rules ---
    
    // 1. Göndərən hesab seçilməlidir
    if (!fromAccountId) {
        showAlert("Göndərən hesabı seçin.", "danger");
        return;
    }

    // 2. Alan hesab nömrəsi boş olmamalıdır
    if (!toAccountNumber) {
        showAlert("Alan hesab nömrəsini daxil edin.", "danger");
        return;
    }

    // 3. Məbləğ 0-dan böyük olmalı və mənfi olmamalıdır
    if (isNaN(amount) || amount <= 0) {
        showAlert("Məbləğ 0-dan böyük olmalıdır.", "danger");
        return;
    }

    // 4. Göndərən və alan hesab eyni hesabdırsa xəbərdarlıq göstər
    const selectedOption = fromAccountSelect.options[fromAccountSelect.selectedIndex];
    const fromAccountNumber = selectedOption ? selectedOption.dataset.accountNumber : "";

    if (fromAccountNumber && fromAccountNumber.toUpperCase() === toAccountNumber.toUpperCase()) {
        showAlert("Göndərən və alan hesab eyni ola bilməz.", "warning");
        return;
    }

    // Loader Spinner / Button disabling during submission
    const submitBtn = document.getElementById("submitBtn");
    const submitSpinner = document.getElementById("submitSpinner");
    submitBtn.disabled = true;
    submitSpinner.classList.remove("d-none");

    const token = localStorage.getItem("token");

    try {
        const response = await fetch(`${API_BASE_URL}/transaction/transfer`, {
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
        });

        // Redirect to login page on HTTP 401 Unauthorized
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = "index.html";
            return;
        }

        let data = {};
        try {
            data = await response.json();
        } catch (err) {
            // In case response is not JSON
        }

        if (!response.ok) {
            throw new Error(data.message || "Köçürmə zamanı xəta baş verdi.");
        }

        // --- Success Handling ---
        showAlert("Köçürmə uğurla tamamlandı", "success");

        // Clear form fields
        document.getElementById("transferForm").reset();

        // Reload accounts list to show updated balance in the dropdown
        await loadAccounts();

    } catch (error) {
        showAlert(error.message, "danger");
    } finally {
        submitBtn.disabled = false;
        submitSpinner.classList.add("d-none");
    }
}

/**
 * Utility helper to display alert messages
 */
function showAlert(message, type = "danger") {
    const alertBox = document.getElementById("alertBox");
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove("d-none");
}

/**
 * Utility helper to hide current alerts
 */
function hideAlert() {
    const alertBox = document.getElementById("alertBox");
    alertBox.classList.add("d-none");
    alertBox.className = "alert d-none";
}
