using OnlineBankingSystem.Domain.Entities;

namespace OnlineBankingSystem.Domain.Repositories;

public interface IBalanceAlertSettingRepository
{
    Task<BalanceAlertSetting?> GetByUserIdAsync(string userId);
    Task AddAsync(BalanceAlertSetting setting);
    Task UpdateAsync(BalanceAlertSetting setting);
}