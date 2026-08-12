using Microsoft.AspNetCore.Identity;

namespace OnlineBankingSystem.Domain.Entities;

public class AppUser : IdentityUser
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;

    public ICollection<Account> Accounts { get; set; } = new List<Account>();
    public ICollection<LoanApplication> LoanApplications { get; set; } = new List<LoanApplication>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
    public BalanceAlertSetting? BalanceAlertSetting { get; set; }
}