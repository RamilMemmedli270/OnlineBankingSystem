using Microsoft.EntityFrameworkCore;
using OnlineBankingSystem.Domain.Entities;
using OnlineBankingSystem.Domain.Repositories;
using OnlineBankingSystem.Persistence.Data;

namespace OnlineBankingSystem.Persistence.Repositories;

public class TransactionRepository : ITransactionRepository
{
    private readonly OnlineBankingDbContext _context;

    public TransactionRepository(OnlineBankingDbContext context)
    {
        _context = context;
    }

    public async Task<Transaction?> GetByIdAsync(int id)
    {
        return await _context.Transactions.FindAsync(id);
    }

    public async Task<IEnumerable<Transaction>> GetAllAsync()
    {
        return await _context.Transactions.ToListAsync();
    }

    public async Task<IEnumerable<Transaction>> GetByAccountIdAsync(int accountId)
    {
        return await _context.Transactions
            .Where(t => t.FromAccountId == accountId || t.ToAccountId == accountId)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<Transaction>> GetByAccountIdAndDateRangeAsync(int accountId, DateTime from, DateTime to)
    {
        return await _context.Transactions
            .Where(t => (t.FromAccountId == accountId || t.ToAccountId == accountId)
                && t.CreatedAt >= from && t.CreatedAt <= to)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
    }

    public async Task AddAsync(Transaction transaction)
    {
        await _context.Transactions.AddAsync(transaction);
        
    }
}