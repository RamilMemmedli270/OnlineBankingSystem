using OnlineBankingSystem.Domain.Enums;

namespace OnlineBankingSystem.Domain.Entities;

public class Account : BaseEntity
{
    public string AccountNumber { get; set; } = string.Empty;

    public AccountType AccountType { get; set; }

    public decimal Balance { get; set; } = 0;

    public AccountStatus Status { get; set; } = AccountStatus.Active;

    public string UserId { get; set; } = string.Empty;

    public AppUser User { get; set; } = null!;

    public ICollection<Transaction> SentTransactions { get; set; } = new List<Transaction>();
    public ICollection<Transaction> ReceivedTransactions { get; set; } = new List<Transaction>();
}