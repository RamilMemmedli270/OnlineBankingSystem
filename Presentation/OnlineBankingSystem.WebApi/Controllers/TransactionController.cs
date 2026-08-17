using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineBankingSystem.Contract.Abstractions;
using OnlineBankingSystem.Contract.Dtos.Transaction;
using System.Security.Claims;
namespace OnlineBankingSystem.WebApi.Controllers;
[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Customer")]
public class TransactionController : ControllerBase
{
    private readonly ITransactionService _transactionService;
    public TransactionController(ITransactionService transactionService)
    {
        _transactionService = transactionService;
    }
    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer(TransferDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();
        try
        {
            var result = await _transactionService.TransferAsync(userId, dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    [HttpGet("account/{accountId}")]
    public async Task<IActionResult> GetHistory(int accountId)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();
        try
        {
            var transactions = await _transactionService.GetByAccountIdAsync(userId, accountId);
            return Ok(transactions);
        }
        catch
        {
            return Forbid();
        }
    }
    [HttpGet("account/{accountId}/statement")]
    public async Task<IActionResult> GetStatement(int accountId, [FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();
        try
        {
            var transactions = await _transactionService.GetStatementAsync(userId, accountId, from, to);
            return Ok(transactions);
        }
        catch
        {
            return Forbid();
        }
    }
}