using AutoMapper;
using OnlineBankingSystem.Contract.Abstractions;
using OnlineBankingSystem.Contract.Dtos;
using OnlineBankingSystem.Domain.Entities;
using OnlineBankingSystem.Domain.Repositories;

namespace OnlineBankingSystem.Application.Services;

public class BalanceAlertSettingService : IBalanceAlertSettingService
{
    private readonly IBalanceAlertSettingRepository _balanceAlertSettingRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public BalanceAlertSettingService(
        IBalanceAlertSettingRepository balanceAlertSettingRepository,
        IUnitOfWork unitOfWork,
        IMapper mapper)
    {
        _balanceAlertSettingRepository = balanceAlertSettingRepository;
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    public async Task<BalanceAlertSettingDto?> GetByUserIdAsync(string userId)
    {
        var setting = await _balanceAlertSettingRepository.GetByUserIdAsync(userId);
        return setting == null ? null : _mapper.Map<BalanceAlertSettingDto>(setting);
    }

    public async Task<BalanceAlertSettingDto> CreateOrUpdateAsync(string userId, decimal threshold, bool isEnabled)
    {
        var existing = await _balanceAlertSettingRepository.GetByUserIdAsync(userId);

        if (existing == null)
        {
            var newSetting = new BalanceAlertSetting
            {
                UserId = userId,
                Threshold = threshold,
                IsEnabled = isEnabled
            };

            await _balanceAlertSettingRepository.AddAsync(newSetting);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<BalanceAlertSettingDto>(newSetting);
        }

        existing.Threshold = threshold;
        existing.IsEnabled = isEnabled;

        await _balanceAlertSettingRepository.UpdateAsync(existing);
        await _unitOfWork.SaveChangesAsync();

        return _mapper.Map<BalanceAlertSettingDto>(existing);
    }
}