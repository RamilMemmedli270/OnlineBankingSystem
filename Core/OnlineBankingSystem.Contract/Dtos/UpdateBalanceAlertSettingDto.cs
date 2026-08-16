namespace OnlineBankingSystem.Contract.Dtos;

public record UpdateBalanceAlertSettingDto
{
    public decimal Threshold { get; init; }
    public bool IsEnabled { get; init; }
}