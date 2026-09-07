namespace OnlineBankingSystem.Contract.Dtos;

public record SavingsGoalDto : BaseDto
{
    public string Title { get; init; } = string.Empty;
    public decimal TargetAmount { get; init; }
    public decimal CurrentAmount { get; init; }
    public decimal ProgressPercentage { get; init; }
}