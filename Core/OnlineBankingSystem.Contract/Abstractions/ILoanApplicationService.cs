using OnlineBankingSystem.Contract.Dtos;
using OnlineBankingSystem.Contract.Dtos.LoanApplication;

namespace OnlineBankingSystem.Contract.Abstractions;

public interface ILoanApplicationService
{
    Task<LoanApplicationDto> ApplyAsync(string userId, CreateLoanDto dto);
    Task<IEnumerable<LoanApplicationDto>> GetByUserIdAsync(string userId);
    Task<IEnumerable<LoanApplicationDto>> GetAllAsync();
    Task<IEnumerable<LoanApplicationDto>> GetPendingAsync();
    Task<LoanApplicationDto> ReviewAsync(int id, string adminId, ReviewLoanDto dto);
}