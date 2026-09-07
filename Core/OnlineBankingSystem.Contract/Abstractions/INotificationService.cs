using OnlineBankingSystem.Contract.Dtos;

namespace OnlineBankingSystem.Contract.Abstractions;

public interface INotificationService
{
    Task<IEnumerable<NotificationDto>> GetByUserIdAsync(string userId);
    Task<IEnumerable<NotificationDto>> GetUnreadByUserIdAsync(string userId);
    Task MarkAsReadAsync(string userId, int id);
    Task CheckAndSendLowBalanceAlertAsync(string userId, decimal currentBalance);
    Task SendTransferReceivedNotificationAsync(string userId, decimal amount, string fromAccountNumber, decimal newBalance);
    Task SendDepositNotificationAsync(string userId, decimal amount, decimal newBalance);
}