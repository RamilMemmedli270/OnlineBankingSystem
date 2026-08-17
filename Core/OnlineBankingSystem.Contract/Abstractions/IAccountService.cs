using OnlineBankingSystem.Contract.Dtos;
using OnlineBankingSystem.Contract.Dtos.Account;
namespace OnlineBankingSystem.Contract.Abstractions;
public interface IAccountService
{
    Task<IEnumerable<AccountDto>> GetAllAsync();
    Task<AccountDto?> GetByIdAsync(string userId, int id);
    Task<IEnumerable<AccountDto>> GetByUserIdAsync(string userId);
    Task<AccountDto> CreateAsync(string userId, CreateAccountDto dto);
    Task UpdateStatusAsync(int id, UpdateAccountStatusDto dto);
}