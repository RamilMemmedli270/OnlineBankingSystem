namespace OnlineBankingSystem.Domain.Entities;

public class SavingsGoal : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public decimal CurrentAmount { get; set; } = 0;
    public string UserId { get; set; } = string.Empty;
    public AppUser User { get; set; } = null!;
}