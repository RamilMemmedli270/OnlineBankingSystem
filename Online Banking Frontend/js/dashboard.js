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

        // --- Admin üçün sidebar məhdudiyyəti ---
        // Admin rolunda olan istifadəçilər üçün müştəri əməliyyatlarına aid
        // linklər (Hesablarım, Köçürmə, Əməliyyatlar, Kreditlər, Bildirişlər,
        // Balans Xəbərdarlığı) sidebar-da gizlədilir. Dashboard və Admin Panel
        // linkləri görünən qalır.
        const restrictedNavIds = ["navAccounts", "navTransfer", "navTransactions", "navLoans", "navNotifications", "navBalanceAlert"];
        restrictedNavIds.forEach(function (id) {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = "none";
            }
        });
        // --- /Admin məhdudiyyəti ---
    }

    document.getElementById("logoutBtn").addEventListener("click", function () {
        localStorage.clear();
        window.location.href = "index.html";
    });
});