using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using OnlineBankingSystem.Domain.Entities;

namespace OnlineBankingSystem.Persistence.Configurations;

public class SavingsGoalConfiguration : IEntityTypeConfiguration<SavingsGoal>
{
    public void Configure(EntityTypeBuilder<SavingsGoal> builder)
    {
        builder.HasKey(sg => sg.Id);

        builder.Property(sg => sg.Title)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(sg => sg.TargetAmount)
            .HasColumnType("decimal(18,2)")
            .IsRequired();

        builder.Property(sg => sg.CurrentAmount)
            .HasColumnType("decimal(18,2)")
            .HasDefaultValue(0)
            .IsRequired();

        builder.HasOne(sg => sg.User)
            .WithMany()
            .HasForeignKey(sg => sg.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}