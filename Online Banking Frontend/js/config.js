const API_BASE_URL = "https://localhost:7032/api";

function maskAccountNumber(accountNumber) {
    if (!accountNumber) return "";
    return accountNumber.replace(/\s+/g, ''); // Ensure no spaces
}