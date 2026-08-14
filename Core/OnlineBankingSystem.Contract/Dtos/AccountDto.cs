using OnlineBankingSystem.Domain.Enums;

namespace OnlineBankingSystem.Contract.Dtos;

public record AccountDto : BaseDto
{
    public string AccountNumber { get; init; } = string.Empty;
    public AccountType AccountType { get; init; }
    public decimal Balance { get; init; }
    public AccountStatus Status { get; init; }
}