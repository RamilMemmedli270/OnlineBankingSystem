namespace OnlineBankingSystem.Contract.Dtos;

public record TopUpSavingsGoalDto
{
    public int AccountId { get; init; }
    public decimal Amount { get; init; }
}