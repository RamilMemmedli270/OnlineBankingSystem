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

    public async Task<BalanceAlertSettingDto> CreateOrUpdateAsync(string userId, UpdateBalanceAlertSettingDto dto)
    {
        if (dto.Threshold < 0)
            throw new Exception("Threshold 0-dan kiçik ola bilməz");

        var existing = await _balanceAlertSettingRepository.GetByUserIdAsync(userId);

        if (existing == null)
        {
            var newSetting = new BalanceAlertSetting
            {
                UserId = userId,
                Threshold = dto.Threshold,
                IsEnabled = dto.IsEnabled
            };

            await _balanceAlertSettingRepository.AddAsync(newSetting);
            await _unitOfWork.SaveChangesAsync();

            return _mapper.Map<BalanceAlertSettingDto>(newSetting);
        }

        existing.Threshold = dto.Threshold;
        existing.IsEnabled = dto.IsEnabled;

        await _balanceAlertSettingRepository.UpdateAsync(existing);
        await _unitOfWork.SaveChangesAsync();

        return _mapper.Map<BalanceAlertSettingDto>(existing);
    }
}