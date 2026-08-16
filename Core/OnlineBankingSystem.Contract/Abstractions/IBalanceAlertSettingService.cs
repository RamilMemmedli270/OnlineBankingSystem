using OnlineBankingSystem.Contract.Dtos;

namespace OnlineBankingSystem.Contract.Abstractions;

public interface IBalanceAlertSettingService
{
    Task<BalanceAlertSettingDto?> GetByUserIdAsync(string userId);
    Task<BalanceAlertSettingDto> CreateOrUpdateAsync(string userId, UpdateBalanceAlertSettingDto dto);
}