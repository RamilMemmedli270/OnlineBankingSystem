document.addEventListener("DOMContentLoaded", function () {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "index.html";
        return;
    }

    const fullName = localStorage.getItem("fullName");
    const roles = JSON.parse(localStorage.getItem("roles") || "[]");

    document.getElementById("fullNameDisplay").textContent = fullName;
    document.getElementById("userGreeting").textContent = `Salam, ${fullName}`;

    if (roles.includes("Admin")) {
        document.getElementById("adminLinkWrapper").style.display = "block";
    }

    document.getElementById("logoutBtn").addEventListener("click", function () {
        localStorage.clear();
        window.location.href = "index.html";
    });
});