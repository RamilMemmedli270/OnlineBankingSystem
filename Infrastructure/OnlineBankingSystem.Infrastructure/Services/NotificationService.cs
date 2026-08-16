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
    private readonly IBalanceAlertSettingRepository _balanceAlertSettingRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public NotificationService(
        INotificationRepository notificationRepository,
        IBalanceAlertSettingRepository balanceAlertSettingRepository,
        IUnitOfWork unitOfWork,
        IMapper mapper)
    {
        _notificationRepository = notificationRepository;
        _balanceAlertSettingRepository = balanceAlertSettingRepository;
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

    public async Task MarkAsReadAsync(string userId, int id)
    {
        var notification = await _notificationRepository.GetByIdAsync(id);
        if (notification == null)
            throw new Exception("Bildiriş tapılmadı");

        if (notification.UserId != userId)
            throw new Exception("Bu bildirişə giriş icazəniz yoxdur");

        await _notificationRepository.MarkAsReadAsync(id);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task CheckAndSendLowBalanceAlertAsync(string userId, decimal currentBalance)
    {
        var setting = await _balanceAlertSettingRepository.GetByUserIdAsync(userId);
        if (setting == null || !setting.IsEnabled || currentBalance >= setting.Threshold)
            return;

        var notification = new Notification
        {
            UserId = userId,
            Title = "Aşağı Balans Xəbərdarlığı",
            Message = $"Hesabınızın balансı {currentBalance} AZN-dir, bu, təyin etdiyiniz həddən aşağıdır.",
            Type = NotificationType.LowBalance,
            IsRead = false
        };

        await _notificationRepository.AddAsync(notification);
       
    }
}