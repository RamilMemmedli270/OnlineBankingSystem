using Microsoft.EntityFrameworkCore;
using OnlineBankingSystem.Domain.Entities;
using OnlineBankingSystem.Domain.Repositories;
using OnlineBankingSystem.Persistence.Data;

namespace OnlineBankingSystem.Persistence.Repositories;

public class SavingsGoalRepository : ISavingsGoalRepository
{
    private readonly OnlineBankingDbContext _context;

    public SavingsGoalRepository(OnlineBankingDbContext context)
    {
        _context = context;
    }

    public async Task AddAsync(SavingsGoal savingsGoal)
    {
        await _context.SavingsGoals.AddAsync(savingsGoal);
    }

    public async Task DeleteAsync(int id)
    {
        var goal = await _context.SavingsGoals.FindAsync(id);
        if (goal != null)
        {
            _context.SavingsGoals.Remove(goal);
        }
    }

    public async Task<SavingsGoal?> GetByIdAsync(int id)
    {
        return await _context.SavingsGoals
            .FirstOrDefaultAsync(sg => sg.Id == id);
    }

    public async Task<IEnumerable<SavingsGoal>> GetByUserIdAsync(string userId)
    {
        return await _context.SavingsGoals
            .Where(sg => sg.UserId == userId)
            .ToListAsync();
    }

    public Task UpdateAsync(SavingsGoal savingsGoal)
    {
        _context.SavingsGoals.Update(savingsGoal);
        return Task.CompletedTask;
    }
}