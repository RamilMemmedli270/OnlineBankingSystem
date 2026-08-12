namespace OnlineBankingSystem.Domain.Entities;

public class LoanApplication : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public AppUser User { get; set; } = null!;
    public decimal Amount { get; set; }
    public int Term { get; set; }
    public string Reason { get; set; } = string.Empty;
    public LoanStatus Status { get; set; } = LoanStatus.Pending;
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedBy { get; set; }
}