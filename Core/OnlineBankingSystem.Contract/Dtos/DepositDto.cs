namespace OnlineBankingSystem.Contract.Dtos;

public record DepositDto
{
    public int AccountId { get; init; }
    public decimal Amount { get; init; }
    public string? Description { get; init; }
}
