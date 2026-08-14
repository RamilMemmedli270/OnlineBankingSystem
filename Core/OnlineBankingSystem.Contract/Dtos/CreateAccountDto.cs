using OnlineBankingSystem.Domain.Enums;

namespace OnlineBankingSystem.Contract.Dtos.Account;

public record CreateAccountDto
{
    public AccountType AccountType { get; init; }
}