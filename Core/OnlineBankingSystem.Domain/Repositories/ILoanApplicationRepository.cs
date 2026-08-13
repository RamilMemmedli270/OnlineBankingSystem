using OnlineBankingSystem.Domain.Entities;
using OnlineBankingSystem.Domain.Enums;

namespace OnlineBankingSystem.Domain.Repositories;

public interface ILoanApplicationRepository
{
    Task<LoanApplication?> GetByIdAsync(int id);
    Task<IEnumerable<LoanApplication>> GetAllAsync();
    Task<IEnumerable<LoanApplication>> GetByUserIdAsync(string userId);
    Task<IEnumerable<LoanApplication>> GetByStatusAsync(LoanStatus status);
    Task AddAsync(LoanApplication loan);
    Task UpdateAsync(LoanApplication loan);
}