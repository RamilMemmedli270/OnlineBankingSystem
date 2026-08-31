document.getElementById("registerForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    const userName = document.getElementById("userName").value;
    const phoneNumber = document.getElementById("phoneNumber").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    const errorBox = document.getElementById("errorBox");
    errorBox.classList.add("d-none");

    if (password !== confirmPassword) {
        errorBox.textContent = "Şifrələr uyğun gəlmir";
        errorBox.classList.remove("d-none");
        return;
    }

    try {
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

        sessionStorage.setItem("token", data.token);
        sessionStorage.setItem("fullName", data.fullName);
        sessionStorage.setItem("roles", JSON.stringify(data.roles));

        window.location.href = "dashboard.html";

    } catch (error) {
        errorBox.textContent = error.message;
        errorBox.classList.remove("d-none");
    }
});

// Toggle Password Visibility
function setupPasswordToggle(btnId, inputId, iconId) {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (btn && input && icon) {
        btn.addEventListener("click", function () {
            const isPassword = input.getAttribute("type") === "password";
            input.setAttribute("type", isPassword ? "text" : "password");
            
            if (isPassword) {
                icon.classList.replace("bi-eye-slash-fill", "bi-eye-fill");
            } else {
                icon.classList.replace("bi-eye-fill", "bi-eye-slash-fill");
            }
        });
    }
}

setupPasswordToggle("togglePasswordBtn1", "password", "togglePasswordIcon1");
setupPasswordToggle("togglePasswordBtn2", "confirmPassword", "togglePasswordIcon2");
