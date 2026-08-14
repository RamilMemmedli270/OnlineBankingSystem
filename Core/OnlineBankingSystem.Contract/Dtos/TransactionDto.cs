using OnlineBankingSystem.Domain.Enums;

namespace OnlineBankingSystem.Contract.Dtos;

public record TransactionDto : BaseDto
{
    public int? FromAccountId { get; init; }
    public int? ToAccountId { get; init; }
    public decimal Amount { get; init; }
    public TransactionType TransactionType { get; init; }
    public decimal BalanceSnapshot { get; init; }
}