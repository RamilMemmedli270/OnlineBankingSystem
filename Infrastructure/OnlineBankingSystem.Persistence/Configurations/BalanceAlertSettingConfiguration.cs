using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnlineBankingSystem.Domain.Entities;

namespace OnlineBankingSystem.Persistence.Configurations;

public class BalanceAlertSettingConfiguration : IEntityTypeConfiguration<BalanceAlertSetting>
{
    public void Configure(EntityTypeBuilder<BalanceAlertSetting> builder)
    {
        builder.HasKey(b => b.Id);

        builder.Property(b => b.Threshold)
            .HasColumnType("decimal(18,2)");

        builder.HasIndex(b => b.UserId)
            .IsUnique();

        builder.HasOne(b => b.User)
            .WithOne(u => u.BalanceAlertSetting)
            .HasForeignKey<BalanceAlertSetting>(b => b.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}