using OnlineBankingSystem.Contract.Dtos;

namespace OnlineBankingSystem.Contract.Abstractions;

public interface ISavingsGoalService
{
    Task<SavingsGoalDto> CreateAsync(string userId, CreateSavingsGoalDto dto);
    Task<IEnumerable<SavingsGoalDto>> GetByUserIdAsync(string userId);
    Task<SavingsGoalDto?> GetByIdAsync(string userId, int id);
    Task<SavingsGoalDto> TopUpAsync(string userId, int id, TopUpSavingsGoalDto dto);
    Task<SavingsGoalDto> WithdrawAsync(string userId, int id, WithdrawSavingsGoalDto dto);
    Task DeleteAsync(string userId, int id);
}