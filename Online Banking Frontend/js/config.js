const API_BASE_URL = "https://localhost:7032/api";

function maskAccountNumber(accountNumber) {
    if (!accountNumber) return "";
    const clean = accountNumber.replace(/\s+/g, '');
    const last4 = clean.slice(-4);
    return `•••• •••• •••• ${last4}`;
}

function formatCardNumber(accountNumber) {
    if (!accountNumber) return "";
    const clean = accountNumber.replace(/\s+/g, '');
    return clean.replace(/(.{4})/g, '$1 ').trim();
}

function parseUtcDate(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date) return dateInput;
    let s = String(dateInput).trim();
    if (s.includes("T") && !s.endsWith("Z") && !s.includes("+") && !s.slice(10).includes("-")) {
        s += "Z";
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

function formatDateAz(dateInput, includeTime = true) {
    if (!dateInput) return "—";
    try {
        const d = parseUtcDate(dateInput);
        if (!d || isNaN(d.getTime())) return "—";

        const monthsAz = [
            "Yan", "Fev", "Mar", "Apr", "May", "İyn", 
            "İyl", "Avq", "Sen", "Okt", "Noy", "Dek"
        ];

        const day = String(d.getDate()).padStart(2, '0');
        const month = monthsAz[d.getMonth()];
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');

        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = d.toDateString() === yesterday.toDateString();

        if (includeTime) {
            if (isToday) {
                return `Bu gün, ${hours}:${minutes}`;
            } else if (isYesterday) {
                return `Dünən, ${hours}:${minutes}`;
            } else if (now.getFullYear() === year) {
                return `${day} ${month}, ${hours}:${minutes}`;
            } else {
                return `${day} ${month} ${year}, ${hours}:${minutes}`;
            }
        } else {
            return `${day} ${month} ${year}`;
        }
    } catch (e) {
        return "—";
    }
}

// Strict Session Isolation: Each tab has its own independent login session
// Purge any legacy token in localStorage so it never leaks across tabs:
try {
    if (localStorage.getItem("token")) {
        localStorage.removeItem("token");
        localStorage.removeItem("fullName");
        localStorage.removeItem("roles");
    }
} catch (_) {}

function getAuthToken() {
    return sessionStorage.getItem("token");
}

function getAuthFullName() {
    return sessionStorage.getItem("fullName") || "Müştəri";
}

function getAuthRoles() {
    try {
        return JSON.parse(sessionStorage.getItem("roles") || "[]");
    } catch (_) {
        return [];
    }
}

function clearAuth() {
    sessionStorage.clear();
    try {
        localStorage.removeItem("token");
        localStorage.removeItem("fullName");
        localStorage.removeItem("roles");
    } catch (_) {}
}

