using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineBankingSystem.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSeparateBalanceSnapshots : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "BalanceSnapshot",
                table: "Transactions",
                newName: "ToBalanceSnapshot");

            migrationBuilder.AddColumn<decimal>(
                name: "FromBalanceSnapshot",
                table: "Transactions",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FromBalanceSnapshot",
                table: "Transactions");

            migrationBuilder.RenameColumn(
                name: "ToBalanceSnapshot",
                table: "Transactions",
                newName: "BalanceSnapshot");
        }
    }
}
