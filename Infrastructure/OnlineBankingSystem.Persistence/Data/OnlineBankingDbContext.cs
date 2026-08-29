using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using OnlineBankingSystem.Domain.Entities;
using OnlineBankingSystem.Persistence.Configurations;

namespace OnlineBankingSystem.Persistence.Data;

public class OnlineBankingDbContext : IdentityDbContext<AppUser>
{
    public OnlineBankingDbContext(
        DbContextOptions<OnlineBankingDbContext> options)
        : base(options)
    {
    }

    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Transaction> Transactions => Set<Transaction>();
    public DbSet<LoanApplication> LoanApplications => Set<LoanApplication>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<BalanceAlertSetting> BalanceAlertSettings => Set<BalanceAlertSetting>();
    public DbSet<SavingsGoal> SavingsGoals => Set<SavingsGoal>();


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(OnlineBankingDbContext).Assembly);
    }
}