using OnlineBankingSystem.Domain.Entities;

namespace OnlineBankingSystem.Domain.Repositories;

public interface INotificationRepository
{
    Task<Notification?> GetByIdAsync(int id);
    Task<IEnumerable<Notification>> GetByUserIdAsync(string userId);
    Task<IEnumerable<Notification>> GetUnreadByUserIdAsync(string userId);
    Task AddAsync(Notification notification);
    Task MarkAsReadAsync(int id);
}