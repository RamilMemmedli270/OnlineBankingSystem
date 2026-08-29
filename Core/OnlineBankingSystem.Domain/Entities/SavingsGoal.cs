using System.ComponentModel;

namespace OnlineBankingSystem.Domain.Entities;

public class SavingsGoal : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public decimal TargetAmount { get; set; }
    public int AccountId { get; set; }
    public Account Account { get; set; } = null!;
    public string UserId { get; set; } = string.Empty;
    public AppUser User { get; set; } = null!;


}
