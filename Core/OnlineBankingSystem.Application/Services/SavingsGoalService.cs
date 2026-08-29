using AutoMapper;
using OnlineBankingSystem.Contract.Abstractions;
using OnlineBankingSystem.Contract.Dtos;
using OnlineBankingSystem.Domain.Entities;
using OnlineBankingSystem.Domain.Repositories;

namespace OnlineBankingSystem.Application.Services;

public class SavingsGoalService : ISavingsGoalService
{
    private readonly ISavingsGoalRepository _savingsGoalRepository;
    private readonly IAccountRepository _accountRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public SavingsGoalService(
        ISavingsGoalRepository savingsGoalRepository,
        IAccountRepository accountRepository,
        IUnitOfWork unitOfWork,
        IMapper mapper)
    {
        _savingsGoalRepository = savingsGoalRepository;
        _accountRepository = accountRepository;
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    public async Task<SavingsGoalDto> CreateAsync(string userId, CreateSavingsGoalDto dto)
    {
        var account = await _accountRepository.GetByIdAsync(dto.AccountId);
        if (account == null)
            throw new Exception("Bağlanacaq hesab tapılmadı");

        if (account.UserId != userId)
            throw new Exception("Bu hesab sizə aid deyil, hədəf bağlana bilməz");

        var savingsGoal = _mapper.Map<SavingsGoal>(dto);
        savingsGoal.UserId = userId;

        await _savingsGoalRepository.AddAsync(savingsGoal);
        await _unitOfWork.SaveChangesAsync();

        savingsGoal.Account = account;

        return _mapper.Map<SavingsGoalDto>(savingsGoal);
    }

    public async Task DeleteAsync(string userId, int id)
    {
        var goal = await _savingsGoalRepository.GetByIdAsync(id);
        if (goal == null)
            throw new Exception("Yığım hədəfi tapılmadı");

        if (goal.UserId != userId)
            throw new Exception("Bu hədəfi silmək icazəniz yoxdur");

        await _savingsGoalRepository.DeleteAsync(id);
        await _unitOfWork.SaveChangesAsync();
    }

    public async Task<SavingsGoalDto?> GetByIdAsync(string userId, int id)
    {
        var goal = await _savingsGoalRepository.GetByIdAsync(id);
        if (goal == null) return null;

        if (goal.UserId != userId)
            throw new Exception("Bu hədəfin məlumatlarına baxmaq icazəniz yoxdur");

        return _mapper.Map<SavingsGoalDto>(goal);
    }

    public async Task<IEnumerable<SavingsGoalDto>> GetByUserIdAsync(string userId)
    {
        var goals = await _savingsGoalRepository.GetByUserIdAsync(userId);
        return _mapper.Map<IEnumerable<SavingsGoalDto>>(goals);
    }
}