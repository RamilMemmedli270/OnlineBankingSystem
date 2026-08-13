using Microsoft.EntityFrameworkCore;
using OnlineBankingSystem.Domain.Entities;
using OnlineBankingSystem.Domain.Enums;
using OnlineBankingSystem.Domain.Repositories;
using OnlineBankingSystem.Persistence.Data;

namespace OnlineBankingSystem.Persistence.Repositories;

public class LoanApplicationRepository : ILoanApplicationRepository
{
    private readonly OnlineBankingDbContext _context;

    public LoanApplicationRepository(OnlineBankingDbContext context)
    {
        _context = context;
    }

    public async Task<LoanApplication?> GetByIdAsync(int id)
    {
        return await _context.LoanApplications.FindAsync(id);
    }

    public async Task<IEnumerable<LoanApplication>> GetAllAsync()
    {
        return await _context.LoanApplications.ToListAsync();
    }

    public async Task<IEnumerable<LoanApplication>> GetByUserIdAsync(string userId)
    {
        return await _context.LoanApplications
            .Where(l => l.UserId == userId)
            .ToListAsync();
    }

    public async Task<IEnumerable<LoanApplication>> GetByStatusAsync(LoanStatus status)
    {
        return await _context.LoanApplications
            .Where(l => l.Status == status)
            .ToListAsync();
    }

    public async Task AddAsync(LoanApplication loan)
    {
        await _context.LoanApplications.AddAsync(loan);
        await _context.SaveChangesAsync();
    }

    public async Task UpdateAsync(LoanApplication loan)
    {
        _context.LoanApplications.Update(loan);
        await _context.SaveChangesAsync();
    }
}