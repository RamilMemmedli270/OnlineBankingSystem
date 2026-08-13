using OnlineBankingSystem.Domain.Entities;

namespace OnlineBankingSystem.Domain.Repositories;

public interface IAccountRepository
{
    Task<Account?> GetByIdAsync(int id);
    Task<Account?> GetByAccountNumberAsync(string accountNumber);
    Task<IEnumerable<Account>> GetAllAsync();
    Task<IEnumerable<Account>> GetByUserIdAsync(string userId);
    Task AddAsync(Account account);
    Task UpdateAsync(Account account);
    Task DeleteAsync(int id);
    Task<bool> ExistsAsync(int id);
}