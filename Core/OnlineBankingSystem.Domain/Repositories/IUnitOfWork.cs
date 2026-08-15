namespace OnlineBankingSystem.Domain.Repositories;

public interface IUnitOfWork
{
    Task<IDbContextTransactionWrapper> BeginTransactionAsync();
    Task<int> SaveChangesAsync();
}