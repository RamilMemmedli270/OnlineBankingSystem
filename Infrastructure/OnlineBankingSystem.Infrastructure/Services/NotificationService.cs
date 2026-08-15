using AutoMapper;
using OnlineBankingSystem.Contract.Abstractions;
using OnlineBankingSystem.Contract.Dtos;
using OnlineBankingSystem.Domain.Entities;
using OnlineBankingSystem.Domain.Enums;
using OnlineBankingSystem.Domain.Repositories;

namespace OnlineBankingSystem.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly INotificationRepository _notificationRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public NotificationService(
        INotificationRepository notificationRepository,
        IUnitOfWork unitOfWork,
        IMapper mapper)
    {
        _notificationRepository = notificationRepository;
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    public async Task<IEnumerable<NotificationDto>> GetByUserIdAsync(string userId)
    {
        var notifications = await _notificationRepository.GetByUserIdAsync(userId);
        return _mapper.Map<IEnumerable<NotificationDto>>(notifications);
    }

    public async Task<IEnumerable<NotificationDto>> GetUnreadByUserIdAsync(string userId)
    {
        var notifications = await _notificationRepository.GetUnreadByUserIdAsync(userId);
        return _mapper.Map<IEnumerable<NotificationDto>>(notifications);
    }

    public async Task MarkAsReadAsync(int id)
    {
        await _notificationRepository.MarkAsReadAsync(id);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task SendLowBalanceAlertAsync(string userId, decimal currentBalance)
    {
        var notification = new Notification
        {
            UserId = userId,
            Title = "Aşağı Balans Xəbərdarlığı",
            Message = $"Hesabınızın balansı {currentBalance} AZN-dir, bu, təyin etdiyiniz həddən aşağıdır.",
            Type = NotificationType.LowBalance,
            IsRead = false
        };

        await _notificationRepository.AddAsync(notification);
        await _unitOfWork.SaveChangesAsync();
    }
}