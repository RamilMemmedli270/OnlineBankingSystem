const API_BASE_URL = "https://localhost:7032/api";

function maskAccountNumber(accountNumber) {
    if (!accountNumber) return "";
    const last4 = accountNumber.slice(-4);
    return `**** ${last4}`;
}