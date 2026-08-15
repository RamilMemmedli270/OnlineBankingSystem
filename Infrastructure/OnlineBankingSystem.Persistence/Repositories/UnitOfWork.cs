using Microsoft.EntityFrameworkCore.Storage;
using OnlineBankingSystem.Domain.Repositories;
using OnlineBankingSystem.Persistence.Data;

namespace OnlineBankingSystem.Persistence.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly OnlineBankingDbContext _context;

    public UnitOfWork(OnlineBankingDbContext context)
    {
        _context = context;
    }

    public async Task<IDbContextTransactionWrapper> BeginTransactionAsync()
    {
        var transaction = await _context.Database.BeginTransactionAsync();
        return new DbContextTransactionWrapper(transaction);
    }

    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }
}