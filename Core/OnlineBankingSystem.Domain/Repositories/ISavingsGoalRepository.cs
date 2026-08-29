using OnlineBankingSystem.Domain.Entities;

namespace OnlineBankingSystem.Domain.Repositories;

public interface ISavingsGoalRepository
{
    Task<SavingsGoal?> GetByIdAsync(int id);

    Task<IEnumerable<SavingsGoal>> GetByUserIdAsync(string userId);

    Task<SavingsGoal?> GetByAccountIdAsync(int accountId);

    Task AddAsync(SavingsGoal savingsGoal);

    Task UpdateAsync(SavingsGoal savingsGoal);

    Task DeleteAsync(int id);
}