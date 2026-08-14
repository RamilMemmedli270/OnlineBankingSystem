using OnlineBankingSystem.Domain.Enums;

namespace OnlineBankingSystem.Contract.Dtos;

public record NotificationDto : BaseDto
{
    public string UserId { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public NotificationType Type { get; init; }
    public bool IsRead { get; init; }
}