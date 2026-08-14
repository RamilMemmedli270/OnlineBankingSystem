using OnlineBankingSystem.Domain.Enums;

namespace OnlineBankingSystem.Contract.Dtos.Account;

public record UpdateAccountStatusDto
{
    public AccountStatus Status { get; init; }
}