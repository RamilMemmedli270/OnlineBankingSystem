using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnlineBankingSystem.Domain.Entities;

namespace OnlineBankingSystem.Persistence.Configurations;

public class LoanApplicationConfiguration : IEntityTypeConfiguration<LoanApplication>
{
    public void Configure(EntityTypeBuilder<LoanApplication> builder)
    {
        builder.HasKey(l => l.Id);

        builder.Property(l => l.Amount)
            .HasColumnType("decimal(18,2)");

        builder.Property(l => l.Reason)
            .HasMaxLength(500);

        builder.HasOne(l => l.User)
            .WithMany(u => u.LoanApplications)
            .HasForeignKey(l => l.UserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}