using OnlineBankingSystem.Contract.Dtos;
using OnlineBankingSystem.Domain.Enums;

namespace OnlineBankingSystem.Contract.Dtos.Transaction;

public record TransactionDto : BaseDto
{
    public int? FromAccountId { get; init; }
    public string? FromAccountNumber { get; init; }
    public int? ToAccountId { get; init; }
    public string? ToAccountNumber { get; init; }
    public decimal Amount { get; init; }
    public TransactionType TransactionType { get; init; }
    public decimal FromBalanceSnapshot { get; init; }
    public decimal ToBalanceSnapshot { get; init; }
}