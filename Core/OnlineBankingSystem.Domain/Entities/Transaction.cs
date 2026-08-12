using OnlineBankingSystem.Domain.Enums;

namespace OnlineBankingSystem.Domain.Entities;

public class Transaction : BaseEntity
{
    public int? FromAccountId { get; set; }
    public Account? FromAccount { get; set; }
    public int? ToAccountId { get; set; }
    public Account? ToAccount { get; set; }
    public decimal Amount { get; set; }
    public TransactionType TransactionType { get; set; }
    public decimal BalanceSnapshot { get; set; }
    public string? Description { get; set; }
}