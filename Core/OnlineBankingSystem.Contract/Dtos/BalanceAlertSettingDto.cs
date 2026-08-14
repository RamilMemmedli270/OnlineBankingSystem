namespace OnlineBankingSystem.Contract.Dtos;

public record BalanceAlertSettingDto : BaseDto
{
    public string UserId { get; init; } = string.Empty;
    public decimal Threshold { get; init; }
    public bool IsEnabled { get; init; }
}
