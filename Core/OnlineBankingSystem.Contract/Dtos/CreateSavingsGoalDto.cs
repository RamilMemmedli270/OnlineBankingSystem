namespace OnlineBankingSystem.Contract.Dtos;

public record CreateSavingsGoalDto
{
    public string Title { get; init; } = string.Empty;
    public decimal TargetAmount { get; init; }
    public int AccountId { get; init; }
}