using OnlineBankingSystem.Domain.Enums;

namespace OnlineBankingSystem.Contract.Dtos.LoanApplication;

public record ReviewLoanDto
{
    public LoanStatus Status { get; init; }
}