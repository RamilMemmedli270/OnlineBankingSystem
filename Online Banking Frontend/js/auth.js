// Uses API_BASE_URL from config.js

document.addEventListener("DOMContentLoaded", function () {
    // DOM Elements
    const loginViewPanel = document.getElementById("loginViewPanel");
    const registerViewPanel = document.getElementById("registerViewPanel");
    const switchToRegisterLink = document.getElementById("switchToRegisterLink");
    const switchToLoginLink = document.getElementById("switchToLoginLink");

    const authErrorAlert = document.getElementById("authErrorAlert");
    const authSuccessAlert = document.getElementById("authSuccessAlert");

    // Helper: Show Error Alert
    function showError(msg) {
        if (authSuccessAlert) authSuccessAlert.classList.add("d-none");
        if (authErrorAlert) {
            const msgSpan = authErrorAlert.querySelector(".alert-msg");
            if (msgSpan) {
                msgSpan.textContent = msg;
            } else {
                authErrorAlert.textContent = msg;
            }
            authErrorAlert.classList.remove("d-none");
        }
    }

    // Helper: Show Success Alert
    function showSuccess(msg) {
        if (authErrorAlert) authErrorAlert.classList.add("d-none");
        if (authSuccessAlert) {
            const msgSpan = authSuccessAlert.querySelector(".alert-msg");
            if (msgSpan) {
                msgSpan.textContent = msg;
            } else {
                authSuccessAlert.textContent = msg;
            }
            authSuccessAlert.classList.remove("d-none");
        }
    }

    // Helper: Clear Alerts
    function clearAlerts() {
        if (authErrorAlert) authErrorAlert.classList.add("d-none");
        if (authSuccessAlert) authSuccessAlert.classList.add("d-none");
    }

    // --- 1. VIEW SWITCHING LOGIC ---
    function showLoginView() {
        clearAlerts();
        if (registerViewPanel) registerViewPanel.classList.remove("active");
        if (loginViewPanel) loginViewPanel.classList.add("active");
        if (history.pushState) {
            history.pushState(null, null, "#login");
        }
    }

    function showRegisterView() {
        clearAlerts();
        if (loginViewPanel) loginViewPanel.classList.remove("active");
        if (registerViewPanel) registerViewPanel.classList.add("active");
        if (history.pushState) {
            history.pushState(null, null, "#register");
        }
    }

    if (switchToRegisterLink) {
        switchToRegisterLink.addEventListener("click", function (e) {
            e.preventDefault();
            showRegisterView();
        });
    }

    if (switchToLoginLink) {
        switchToLoginLink.addEventListener("click", function (e) {
            e.preventDefault();
            showLoginView();
        });
    }

    // Check URL Hash or Initial State
    if (window.location.hash === "#register" || window.location.pathname.endsWith("register.html")) {
        showRegisterView();
    } else {
        showLoginView();
    }

    // --- 2. PASSWORD TOGGLE LOGIC ---
    function setupPasswordToggle(btnId, inputId, iconId) {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        const icon = document.getElementById(iconId);

        if (btn && input && icon) {
            btn.addEventListener("click", function () {
                const isPassword = input.getAttribute("type") === "password";
                input.setAttribute("type", isPassword ? "text" : "password");
                if (isPassword) {
                    icon.classList.replace("bi-eye", "bi-eye-slash");
                } else {
                    icon.classList.replace("bi-eye-slash", "bi-eye");
                }
            });
        }
    }

    setupPasswordToggle("toggleLoginPasswordBtn", "loginPassword", "toggleLoginPasswordIcon");
    setupPasswordToggle("toggleRegPasswordBtn", "regPassword", "toggleRegPasswordIcon");
    setupPasswordToggle("toggleConfirmPasswordBtn", "regConfirmPassword", "toggleConfirmPasswordIcon");

    // --- 3. LOGIN SUBMIT ---
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            clearAlerts();

            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value;
            const rememberMe = document.getElementById("rememberMe") ? document.getElementById("rememberMe").checked : false;

            const submitBtn = document.getElementById("loginSubmitBtn");
            const originalHtml = submitBtn.innerHTML;

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<span>Daxil olunur...</span> <span class="spinner-border spinner-border-sm ms-1"></span>`;

                const response = await fetch(`${API_BASE_URL}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ email, password, rememberMe })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Email və ya şifrə yanlışdır");
                }

                // Save to sessionStorage (always), and localStorage only if rememberMe is checked
                sessionStorage.setItem("token", data.token);
                sessionStorage.setItem("fullName", data.fullName);
                sessionStorage.setItem("roles", JSON.stringify(data.roles));

                if (rememberMe) {
                    localStorage.setItem("token", data.token);
                    localStorage.setItem("fullName", data.fullName);
                    localStorage.setItem("roles", JSON.stringify(data.roles));
                } else {
                    localStorage.removeItem("token");
                    localStorage.removeItem("fullName");
                    localStorage.removeItem("roles");
                }

                showSuccess("Uğurla daxil oldunuz! İdarəetmə panelinə yönləndirilirsiniz...");
                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 800);

            } catch (error) {
                showError(error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
            }
        });
    }

    // --- 4. REGISTER SUBMIT ---
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async function (e) {
            e.preventDefault();
            clearAlerts();

            const firstName = document.getElementById("regFirstName").value.trim();
            const lastName = document.getElementById("regLastName").value.trim();
            const userName = document.getElementById("regUserName").value.trim();
            const phoneNumber = document.getElementById("regPhone").value.trim();
            const email = document.getElementById("regEmail").value.trim();
            const password = document.getElementById("regPassword").value;
            const confirmPassword = document.getElementById("regConfirmPassword").value;

            if (password !== confirmPassword) {
                showError("Daxil edilən şifrələr bir-biri ilə uyğun gəlmir.");
                return;
            }

            const submitBtn = document.getElementById("regSubmitBtn");
            const originalHtml = submitBtn.innerHTML;

            try {
                submitBtn.disabled = true;
                submitBtn.innerHTML = `<span>Hesab yaradılır...</span> <span class="spinner-border spinner-border-sm ms-1"></span>`;

                const response = await fetch(`${API_BASE_URL}/auth/register`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        userName,
                        firstName,
                        lastName,
                        email,
                        password,
                        phoneNumber
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || "Qeydiyyat zamanı xəta baş verdi");
                }

                // Save to both sessionStorage and localStorage
                sessionStorage.setItem("token", data.token);
                sessionStorage.setItem("fullName", data.fullName);
                sessionStorage.setItem("roles", JSON.stringify(data.roles));

                localStorage.setItem("token", data.token);
                localStorage.setItem("fullName", data.fullName);
                localStorage.setItem("roles", JSON.stringify(data.roles));

                showSuccess("Qeydiyyat uğurla tamamlandı! İdarəetmə panelinə yönləndirilirsiniz...");
                setTimeout(() => {
                    window.location.href = "dashboard.html";
                }, 900);

            } catch (error) {
                showError(error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
            }
        });
    }
});
