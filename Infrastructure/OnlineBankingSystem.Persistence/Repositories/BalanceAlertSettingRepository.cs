using Microsoft.EntityFrameworkCore;
using OnlineBankingSystem.Domain.Entities;
using OnlineBankingSystem.Domain.Repositories;
using OnlineBankingSystem.Persistence.Data;

namespace OnlineBankingSystem.Persistence.Repositories;

public class BalanceAlertSettingRepository : IBalanceAlertSettingRepository
{
    private readonly OnlineBankingDbContext _context;

    public BalanceAlertSettingRepository(OnlineBankingDbContext context)
    {
        _context = context;
    }

    public async Task<BalanceAlertSetting?> GetByUserIdAsync(string userId)
    {
        return await _context.BalanceAlertSettings
            .FirstOrDefaultAsync(b => b.UserId == userId);
    }

    public async Task AddAsync(BalanceAlertSetting setting)
    {
        await _context.BalanceAlertSettings.AddAsync(setting);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(BalanceAlertSetting setting)
    {
        _context.BalanceAlertSettings.Update(setting);
        await _context.SaveChangesAsync();
    }
}