using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineBankingSystem.Contract.Abstractions;
using OnlineBankingSystem.Contract.Dtos;
using System.Security.Claims;
namespace OnlineBankingSystem.WebApi.Controllers;
[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Customer")]
public class BalanceAlertSettingController : ControllerBase
{
    private readonly IBalanceAlertSettingService _balanceAlertSettingService;
    public BalanceAlertSettingController(IBalanceAlertSettingService balanceAlertSettingService)
    {
        _balanceAlertSettingService = balanceAlertSettingService;
    }
    [HttpGet]
    public async Task<IActionResult> GetMySetting()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();
        var setting = await _balanceAlertSettingService.GetByUserIdAsync(userId);
        if (setting == null)
            return NotFound();
        return Ok(setting);
    }
    [HttpPut]
    public async Task<IActionResult> CreateOrUpdate(UpdateBalanceAlertSettingDto dto)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();
        try
        {
            var result = await _balanceAlertSettingService.CreateOrUpdateAsync(userId, dto);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}