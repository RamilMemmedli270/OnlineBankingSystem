using Microsoft.EntityFrameworkCore;
using OnlineBankingSystem.Domain.Entities;
using OnlineBankingSystem.Domain.Repositories;
using OnlineBankingSystem.Persistence.Data;

namespace OnlineBankingSystem.Persistence.Repositories;

public class AccountRepository : IAccountRepository
{
    private readonly OnlineBankingDbContext _context;

    public AccountRepository(OnlineBankingDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(Account account)
    {
        await _context.Accounts.AddAsync(account);
    }

    public async Task DeleteAsync(int id)
    {
        var account = await _context.Accounts.FindAsync(id);
        if (account != null)
        {
            _context.Accounts.Remove(account);
        }
    }

    public async Task<bool> ExistsAsync(int id)
    {
        return await _context.Accounts.AnyAsync(a => a.Id == id);
    }

    public async Task<IEnumerable<Account>> GetAllAsync()
    {
        return await _context.Accounts.ToListAsync();
    }

    public async Task<Account?> GetByAccountNumberAsync(string accountNumber)
    {
        return await _context.Accounts
            .FirstOrDefaultAsync(a => a.AccountNumber == accountNumber);
    }

    public async Task<Account?> GetByIdAsync(int id)
    {
        return await _context.Accounts.FindAsync(id);
    }

    public async Task<IEnumerable<Account>> GetByUserIdAsync(string userId)
    {
        return await _context.Accounts
            .Where(a => a.UserId == userId)
            .ToListAsync();
    }

    public Task UpdateAsync(Account account)
    {
        _context.Accounts.Update(account);
        return Task.CompletedTask;
    }
}