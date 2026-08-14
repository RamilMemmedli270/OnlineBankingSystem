using OnlineBankingSystem.Domain.Enums;

namespace OnlineBankingSystem.Contract.Dtos;

public record LoanApplicationDto : BaseDto
{
    public string UserId { get; init; } = string.Empty;
    public decimal Amount { get; init; }
    public int Term { get; init; }
    public string Reason { get; init; } = string.Empty;
    public LoanStatus Status { get; init; }
    public DateTime? ReviewedAt { get; init; }
    public string? ReviewedBy { get; init; }
}