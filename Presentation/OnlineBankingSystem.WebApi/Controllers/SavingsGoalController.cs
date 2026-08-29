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

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();

        try
        {
            await _savingsGoalService.DeleteAsync(userId, id);
            return Ok(new { message = "Yığım hədəfi uğurla silindi" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}