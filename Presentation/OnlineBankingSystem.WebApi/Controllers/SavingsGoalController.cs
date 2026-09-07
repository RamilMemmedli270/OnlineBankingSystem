using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineBankingSystem.Contract.Abstractions;
using OnlineBankingSystem.Contract.Dtos;
using System.Security.Claims;

namespace OnlineBankingSystem.WebApi.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Customer")]
public class SavingsGoalController : ControllerBase
{
    private readonly ISavingsGoalService _savingsGoalService;

    public SavingsGoalController(ISavingsGoalService savingsGoalService)
    {
        _savingsGoalService = savingsGoalService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMyGoals()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        var goals = await _savingsGoalService.GetByUserIdAsync(userId);
        return Ok(goals);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        try
        {
            var goal = await _savingsGoalService.GetByIdAsync(userId, id);
            if (goal == null) return NotFound(new { message = "Yığım qutusu tapılmadı." });
            return Ok(goal);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateSavingsGoalDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        try
        {
            var result = await _savingsGoalService.CreateAsync(userId, dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/topup")]
    public async Task<IActionResult> TopUp(int id, TopUpSavingsGoalDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        try
        {
            var result = await _savingsGoalService.TopUpAsync(userId, id, dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{id}/withdraw")]
    public async Task<IActionResult> Withdraw(int id, WithdrawSavingsGoalDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        try
        {
            var result = await _savingsGoalService.WithdrawAsync(userId, id, dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        try
        {
            await _savingsGoalService.DeleteAsync(userId, id);
            return Ok(new { message = "Yığım qutusu uğurla silindi və qalıq məbləğ hesabınıza qaytarıldı." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}