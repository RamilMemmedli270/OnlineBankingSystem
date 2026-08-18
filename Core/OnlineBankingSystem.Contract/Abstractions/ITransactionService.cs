using OnlineBankingSystem.Contract.Dtos;
using OnlineBankingSystem.Contract.Dtos.Transaction;

namespace OnlineBankingSystem.Contract.Abstractions;

public interface ITransactionService
{
    Task<TransactionDto> TransferAsync(string userId, TransferDto dto);
    Task<TransactionDto> DepositAsync(string userId, DepositDto dto);
    Task<IEnumerable<TransactionDto>> GetByAccountIdAsync(string userId, int accountId);
    Task<IEnumerable<TransactionDto>> GetStatementAsync(string userId, int accountId, DateTime from, DateTime to);
}