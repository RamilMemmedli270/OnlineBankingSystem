using Microsoft.EntityFrameworkCore.Storage;
using OnlineBankingSystem.Domain.Repositories;

namespace OnlineBankingSystem.Persistence.Repositories;

public class DbContextTransactionWrapper : IDbContextTransactionWrapper
{
    private readonly IDbContextTransaction _transaction;

    public DbContextTransactionWrapper(IDbContextTransaction transaction)
    {
        _transaction = transaction;
    }

    public async Task CommitAsync()
    {
        await _transaction.CommitAsync();
    }

    public async Task RollbackAsync()
    {
        await _transaction.RollbackAsync();
    }

    public async ValueTask DisposeAsync()
    {
        await _transaction.DisposeAsync();
    }
}