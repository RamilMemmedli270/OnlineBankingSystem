using OnlineBankingSystem.Contract.Dtos;

namespace OnlineBankingSystem.Contract.Abstractions;

public interface ISavingsGoalService
{
    Task<IEnumerable<SavingsGoalDto>> GetByUserIdAsync(string userId);

    Task<SavingsGoalDto?> GetByIdAsync(string userId, int id);

    Task<SavingsGoalDto> CreateAsync(string userId, CreateSavingsGoalDto dto);

    Task DeleteAsync(string userId, int id);
}