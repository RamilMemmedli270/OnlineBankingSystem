namespace OnlineBankingSystem.Domain.Repositories;

public interface IDbContextTransactionWrapper : IAsyncDisposable
{
    Task CommitAsync();
    Task RollbackAsync();
}