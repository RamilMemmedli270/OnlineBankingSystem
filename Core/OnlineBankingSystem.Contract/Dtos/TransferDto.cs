namespace OnlineBankingSystem.Contract.Dtos.Transaction;

public record TransferDto
{
    public int FromAccountId { get; init; }
    public string ToAccountNumber { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public string? Description { get; init; }
}