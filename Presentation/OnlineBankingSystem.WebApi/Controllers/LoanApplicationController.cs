using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineBankingSystem.Contract.Abstractions;
using OnlineBankingSystem.Contract.Dtos.LoanApplication;
using System.Security.Claims;
namespace OnlineBankingSystem.WebApi.Controllers;
[Route("api/[controller]")]
[ApiController]
[Authorize]
public class LoanApplicationController : ControllerBase
{
    private readonly ILoanApplicationService _loanService;
    public LoanApplicationController(ILoanApplicationService loanService)
    {
        _loanService = loanService;
    }
    [HttpPost]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> Apply(CreateLoanDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();
        try
        {
            var result = await _loanService.ApplyAsync(userId, dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
    [HttpGet("my")]
    [Authorize(Roles = "Customer")]
    public async Task<IActionResult> GetMyLoans()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();
        var loans = await _loanService.GetByUserIdAsync(userId);
        return Ok(loans);
    }
    [HttpGet("all")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll()
    {
        var loans = await _loanService.GetAllAsync();
        return Ok(loans);
    }
    [HttpGet("pending")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetPending()
    {
        var loans = await _loanService.GetPendingAsync();
        return Ok(loans);
    }
    [HttpPatch("{id}/review")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Review(int id, ReviewLoanDto dto)
    {
        var adminId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (adminId == null)
            return Unauthorized();
        try
        {
            var result = await _loanService.ReviewAsync(id, adminId, dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}