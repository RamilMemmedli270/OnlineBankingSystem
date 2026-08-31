document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const rememberMe = document.getElementById("rememberMe").checked;

    const errorBox = document.getElementById("errorBox");
    errorBox.classList.add("d-none");

    try {
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
const togglePasswordBtn = document.getElementById("togglePasswordBtn");
const passwordInput = document.getElementById("password");
const togglePasswordIcon = document.getElementById("togglePasswordIcon");

if (togglePasswordBtn && passwordInput && togglePasswordIcon) {
    togglePasswordBtn.addEventListener("click", function () {
        const isPassword = passwordInput.getAttribute("type") === "password";
        passwordInput.setAttribute("type", isPassword ? "text" : "password");
        
        if (isPassword) {
            togglePasswordIcon.classList.replace("bi-eye-slash-fill", "bi-eye-fill");
        } else {
            togglePasswordIcon.classList.replace("bi-eye-fill", "bi-eye-slash-fill");
        }
    });
}
