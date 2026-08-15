using OnlineBankingSystem.Contract.Dtos;

namespace OnlineBankingSystem.Contract.Abstractions;


public interface INotificationService
{
    Task<IEnumerable<NotificationDto>> GetByUserIdAsync(string userId);
    Task<IEnumerable<NotificationDto>> GetUnreadByUserIdAsync(string userId);
    Task MarkAsReadAsync(int id);
    Task SendLowBalanceAlertAsync(string userId, decimal currentBalance);
}