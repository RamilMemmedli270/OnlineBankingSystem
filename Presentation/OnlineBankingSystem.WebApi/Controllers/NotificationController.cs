using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OnlineBankingSystem.Contract.Abstractions;
using System.Security.Claims;
namespace OnlineBankingSystem.WebApi.Controllers;
[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Customer")]
public class NotificationController : ControllerBase
{
    private readonly INotificationService _notificationService;
    public NotificationController(INotificationService notificationService)
    {
        _notificationService = notificationService;
    }
    [HttpGet]
    public async Task<IActionResult> GetMyNotifications()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();
        var notifications = await _notificationService.GetByUserIdAsync(userId);
        return Ok(notifications);
    }
    [HttpGet("unread")]
    public async Task<IActionResult> GetUnread()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();
        var notifications = await _notificationService.GetUnreadByUserIdAsync(userId);
        return Ok(notifications);
    }
    [HttpPatch("{id}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userId == null)
            return Unauthorized();
        try
        {
            await _notificationService.MarkAsReadAsync(userId, id);
            return NoContent();
        }
        catch
        {
            return Forbid();
        }
    }
}