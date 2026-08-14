namespace OnlineBankingSystem.Contract.Dtos.LoanApplication;

public record CreateLoanDto
{
    public decimal Amount { get; init; }
    public int Term { get; init; }
    public string Reason { get; init; } = string.Empty;
}