namespace OnlineBankingSystem.Contract.Dtos;

public record SavingsGoalDto : BaseDto
{
    public string Title { get; init; } = string.Empty;
    public decimal TargetAmount { get; init; }
    public int AccountId { get; init; }

    public string AccountNumber { get; init; } = string.Empty;
    public decimal CurrentBalance { get; init; }

    public decimal ProgressPercentage { get; init; }
}