namespace OnlineBankingSystem.Domain.Entities;

public class Notification : BaseEntity
{
    public string UserId { get; set; } = string.Empty;
    public AppUser User { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public bool IsRead { get; set; } = false;
}