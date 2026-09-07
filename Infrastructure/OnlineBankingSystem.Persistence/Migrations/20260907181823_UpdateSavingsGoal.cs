using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineBankingSystem.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateSavingsGoal : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_SavingsGoals_Accounts_AccountId",
                table: "SavingsGoals");

            migrationBuilder.DropIndex(
                name: "IX_SavingsGoals_AccountId",
                table: "SavingsGoals");

            migrationBuilder.DropColumn(
                name: "AccountId",
                table: "SavingsGoals");

            migrationBuilder.AddColumn<decimal>(
                name: "CurrentAmount",
                table: "SavingsGoals",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CurrentAmount",
                table: "SavingsGoals");

            migrationBuilder.AddColumn<int>(
                name: "AccountId",
                table: "SavingsGoals",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_SavingsGoals_AccountId",
                table: "SavingsGoals",
                column: "AccountId");

            migrationBuilder.AddForeignKey(
                name: "FK_SavingsGoals_Accounts_AccountId",
                table: "SavingsGoals",
                column: "AccountId",
                principalTable: "Accounts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
