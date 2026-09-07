namespace OnlineBankingSystem.Contract.Dtos;

public record WithdrawSavingsGoalDto
{
    public int AccountId { get; init; }
    public decimal Amount { get; init; }
}