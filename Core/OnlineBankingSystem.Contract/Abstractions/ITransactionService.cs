using OnlineBankingSystem.Contract.Dtos;
using OnlineBankingSystem.Contract.Dtos.Transaction;

namespace OnlineBankingSystem.Contract.Abstractions;

public interface ITransactionService
{
    Task<TransactionDto> TransferAsync(string userId, TransferDto dto);
    Task<IEnumerable<TransactionDto>> GetByAccountIdAsync(int accountId);
    Task<IEnumerable<TransactionDto>> GetStatementAsync(int accountId, DateTime from, DateTime to);
}