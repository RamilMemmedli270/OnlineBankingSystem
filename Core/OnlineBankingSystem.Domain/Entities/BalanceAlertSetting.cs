namespace OnlineBankingSystem.Domain.Entities;

public class BalanceAlertSetting : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public AppUser User { get; set; } = null!;
    public decimal Threshold { get; set; }
    public bool IsEnabled { get; set; } = true;
}