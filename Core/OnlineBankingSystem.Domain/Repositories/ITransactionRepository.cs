using OnlineBankingSystem.Domain.Entities;

namespace OnlineBankingSystem.Domain.Repositories;

public interface ITransactionRepository
{
    Task<Transaction?> GetByIdAsync(int id);
    Task<IEnumerable<Transaction>> GetAllAsync();
    Task<IEnumerable<Transaction>> GetByAccountIdAsync(int accountId);
    Task<IEnumerable<Transaction>> GetByAccountIdAndDateRangeAsync(int accountId, DateTime from, DateTime to);
    Task AddAsync(Transaction transaction);
}