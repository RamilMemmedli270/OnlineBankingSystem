document.addEventListener("DOMContentLoaded", function () {
    const token = sessionStorage.getItem("token");

    if (!token) {
        window.location.href = "index.html";
        return;
    }

   
    const roles = JSON.parse(sessionStorage.getItem("roles") || "[]");

    if (roles.includes("Admin") && !roles.includes("Customer")) {
        window.location.href = "dashboard.html";
        return;
    }

    
    if (roles.includes("Admin")) {
        hideCustomerNavLinks();
    }

    loadSetting();

    document.getElementById("balanceAlertForm").addEventListener("submit", handleSubmit);
});

function hideCustomerNavLinks() {
    const idsToHide = [
        "navAccounts",
        "navTransfer",
        "navTransactions",
        "navLoans",
        "navNotifications",
        "navBalanceAlert"
    ];

    idsToHide.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = "none";
        }
    });
}

async function loadSetting() {
    const token = sessionStorage.getItem("token");
    const loadingState = document.getElementById("loadingState");
    const formContainer = document.getElementById("formContainer");

    loadingState.classList.remove("d-none");
    formContainer.classList.add("d-none");

    try {
        const response = await fetch(`${API_BASE_URL}/balancealertsetting`, {
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

        if (response.status === 404) {
            showForm();
            return;
        }

        if (!response.ok) {
            let errorData = {};
            try {
                errorData = await response.json();
            } catch (err) {}
            throw new Error(errorData.message || "Ayarları yükləmək mümkün olmadı.");
        }

        const setting = await response.json();
        document.getElementById("threshold").value = setting.threshold;
        document.getElementById("isEnabled").checked = setting.isEnabled;
        showForm();

    } catch (error) {
        loadingState.classList.add("d-none");
        showForm();
        showAlert(error.message, "danger");
    }
}

async function handleSubmit(e) {
    e.preventDefault();

    const token = sessionStorage.getItem("token");
    const saveBtn = document.getElementById("saveBtn");

    const threshold = parseFloat(document.getElementById("threshold").value);
    const isEnabled = document.getElementById("isEnabled").checked;

    if (isNaN(threshold) || threshold < 0) {
        showAlert("Threshold mənfi ola bilməz.", "danger");
        return;
    }

    saveBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE_URL}/balancealertsetting`, {
            method: "PUT",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ threshold, isEnabled })
        });

        if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = "index.html";
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Ayarlar yadda saxlanılarkən xəta baş verdi");
        }

        showAlert("Ayarlarınız yadda saxlanıldı", "success");

    } catch (error) {
        showAlert(error.message, "danger");
    } finally {
        saveBtn.disabled = false;
    }
}

function showForm() {
    document.getElementById("loadingState").classList.add("d-none");
    document.getElementById("formContainer").classList.remove("d-none");
}

let alertTimeout = null;

function showAlert(message, type) {
    const alertBox = document.getElementById("alertBox");
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.classList.remove("d-none");

    if (alertTimeout) {
        clearTimeout(alertTimeout);
    }

    if (type === "success") {
        alertTimeout = setTimeout(() => {
            alertBox.classList.add("d-none");
        }, 5000);
    }
}
