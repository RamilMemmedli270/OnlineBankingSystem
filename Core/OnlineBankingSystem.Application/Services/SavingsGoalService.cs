using AutoMapper;
using Microsoft.Extensions.Logging;
using OnlineBankingSystem.Contract.Abstractions;
using OnlineBankingSystem.Contract.Dtos;
using OnlineBankingSystem.Domain.Entities;
using OnlineBankingSystem.Domain.Enums;
using OnlineBankingSystem.Domain.Repositories;

namespace OnlineBankingSystem.Application.Services;

public class SavingsGoalService : ISavingsGoalService
{
    private readonly ISavingsGoalRepository _savingsGoalRepository;
    private readonly IAccountRepository _accountRepository;
    private readonly ITransactionRepository _transactionRepository;
    private readonly INotificationRepository _notificationRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<SavingsGoalService> _logger;

    public SavingsGoalService(
        ISavingsGoalRepository savingsGoalRepository,
        IAccountRepository accountRepository,
        ITransactionRepository transactionRepository,
        INotificationRepository notificationRepository,
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<SavingsGoalService> logger)
    {
        _savingsGoalRepository = savingsGoalRepository;
        _accountRepository = accountRepository;
        _transactionRepository = transactionRepository;
        _notificationRepository = notificationRepository;
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<SavingsGoalDto> CreateAsync(string userId, CreateSavingsGoalDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new Exception("Hədəfin adı boş ola bilməz.");

        if (dto.TargetAmount <= 0)
            throw new Exception("Hədəf məbləği 0-dan böyük olmalıdır.");

        var savingsGoal = _mapper.Map<SavingsGoal>(dto);
        savingsGoal.UserId = userId;
        savingsGoal.CurrentAmount = 0;

        await _savingsGoalRepository.AddAsync(savingsGoal);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Yeni yığım qutusu yaradıldı: {UserId}, Adı: {Title}, Hədəf: {TargetAmount} AZN",
            userId, dto.Title, dto.TargetAmount);

        return _mapper.Map<SavingsGoalDto>(savingsGoal);
    }

    public async Task<IEnumerable<SavingsGoalDto>> GetByUserIdAsync(string userId)
    {
        var goals = await _savingsGoalRepository.GetByUserIdAsync(userId);
        return _mapper.Map<IEnumerable<SavingsGoalDto>>(goals);
    }

    public async Task<SavingsGoalDto?> GetByIdAsync(string userId, int id)
    {
        var goal = await _savingsGoalRepository.GetByIdAsync(id);
        if (goal == null) return null;

        if (goal.UserId != userId)
            throw new Exception("Bu hədəfə baxmaq icazəniz yoxdur.");

        return _mapper.Map<SavingsGoalDto>(goal);
    }

    public async Task<SavingsGoalDto> TopUpAsync(string userId, int id, TopUpSavingsGoalDto dto)
    {
        if (dto.Amount <= 0)
            throw new Exception("Yüklənəcək məbləğ 0-dan böyük olmalıdır.");

        var goal = await _savingsGoalRepository.GetByIdAsync(id);
        if (goal == null)
            throw new Exception("Yığım qutusu tapılmadı.");

        if (goal.UserId != userId)
            throw new Exception("Bu qutu sizə aid deyil.");

        var account = await _accountRepository.GetByIdAsync(dto.AccountId);
        if (account == null)
            throw new Exception("Seçilmiş hesab tapılmadı.");

        if (account.UserId != userId)
            throw new Exception("Bu hesab sizə aid deyil.");

        if (account.Status == AccountStatus.Frozen)
            throw new Exception("Dondurulmuş hesabdan əməliyyat aparıla bilməz.");

        if (account.Balance < dto.Amount)
            throw new Exception("Hesabınızda kifayət qədər vəsait yoxdur.");

        await using var dbTransaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            // Kartdan pulu çıxırıq, qutuya əlavə edirik
            account.Balance -= dto.Amount;
            goal.CurrentAmount += dto.Amount;

            await _accountRepository.UpdateAsync(account);
            await _savingsGoalRepository.UpdateAsync(goal);

            // Əməliyyatlar siyahısına qeyd edirik
            var transaction = new Transaction
            {
                FromAccountId = account.Id,
                Amount = dto.Amount,
                TransactionType = TransactionType.Transfer,
                FromBalanceSnapshot = account.Balance,
                Description = $"\"{goal.Title}\" yığım qutusuna vəsait köçürüldü"
            };
            await _transactionRepository.AddAsync(transaction);

            // Əgər hədəfə çatılıbsa, təbrik bildirişi göndəririk
            if (goal.CurrentAmount >= goal.TargetAmount)
            {
                var notification = new Notification
                {
                    UserId = userId,
                    Title = "Hədəfinizə Çatdınız! 🎯🎉",
                    Message = $"Təbriklər! \"{goal.Title}\" adlı yığım hədəfiniz tam toplandı ({goal.CurrentAmount:N2} AZN).",
                    Type = NotificationType.System,
                    IsRead = false
                };
                await _notificationRepository.AddAsync(notification);
            }

            await _unitOfWork.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            _logger.LogInformation("Qutuya pul yükləndi: {UserId}, Qutu: {GoalTitle}, Məbləğ: {Amount} AZN",
                userId, goal.Title, dto.Amount);

            return _mapper.Map<SavingsGoalDto>(goal);
        }
        catch
        {
            await dbTransaction.RollbackAsync();
            throw;
        }
    }

    public async Task<SavingsGoalDto> WithdrawAsync(string userId, int id, WithdrawSavingsGoalDto dto)
    {
        if (dto.Amount <= 0)
            throw new Exception("Çıxarılacaq məbləğ 0-dan böyük olmalıdır.");

        var goal = await _savingsGoalRepository.GetByIdAsync(id);
        if (goal == null)
            throw new Exception("Yığım qutusu tapılmadı.");

        if (goal.UserId != userId)
            throw new Exception("Bu qutu sizə aid deyil.");

        if (goal.CurrentAmount < dto.Amount)
            throw new Exception("Qutuda kifayət qədər vəsait yoxdur.");

        var account = await _accountRepository.GetByIdAsync(dto.AccountId);
        if (account == null)
            throw new Exception("Köçürüləcək hesab tapılmadı.");

        if (account.UserId != userId)
            throw new Exception("Bu hesab sizə aid deyil.");

        if (account.Status == AccountStatus.Frozen)
            throw new Exception("Dondurulmuş hesaba köçürmə edilə bilməz.");

        await using var dbTransaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            // Qutudan pulu çıxırıq, karta geri köçürürük
            goal.CurrentAmount -= dto.Amount;
            account.Balance += dto.Amount;

            await _savingsGoalRepository.UpdateAsync(goal);
            await _accountRepository.UpdateAsync(account);

            // Əməliyyat tarixçəsinə mədaxil kimi qeyd edirik
            var transaction = new Transaction
            {
                ToAccountId = account.Id,
                Amount = dto.Amount,
                TransactionType = TransactionType.Deposit,
                ToBalanceSnapshot = account.Balance,
                Description = $"\"{goal.Title}\" yığım qutusundan vəsait çıxarıldı"
            };
            await _transactionRepository.AddAsync(transaction);

            await _unitOfWork.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            _logger.LogInformation("Qutudan pul çıxarıldı: {UserId}, Qutu: {GoalTitle}, Məbləğ: {Amount} AZN",
                userId, goal.Title, dto.Amount);

            return _mapper.Map<SavingsGoalDto>(goal);
        }
        catch
        {
            await dbTransaction.RollbackAsync();
            throw;
        }
    }

    public async Task DeleteAsync(string userId, int id)
    {
        var goal = await _savingsGoalRepository.GetByIdAsync(id);
        if (goal == null)
            throw new Exception("Yığım qutusu tapılmadı.");

        if (goal.UserId != userId)
            throw new Exception("Bu qutunu silmək icazəniz yoxdur.");

        await using var dbTransaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            // Əgər qutunun içində pul varsa, onu avtomatik olaraq müştərinin aktiv hesabına qaytarırıq (pul itmir)
            if (goal.CurrentAmount > 0)
            {
                var userAccounts = await _accountRepository.GetByUserIdAsync(userId);
                var targetAccount = userAccounts.FirstOrDefault(a => a.AccountType == AccountType.Current && a.Status == AccountStatus.Active)
                                 ?? userAccounts.FirstOrDefault(a => a.Status == AccountStatus.Active);

                if (targetAccount != null)
                {
                    targetAccount.Balance += goal.CurrentAmount;
                    await _accountRepository.UpdateAsync(targetAccount);

                    var refundTx = new Transaction
                    {
                        ToAccountId = targetAccount.Id,
                        Amount = goal.CurrentAmount,
                        TransactionType = TransactionType.Deposit,
                        ToBalanceSnapshot = targetAccount.Balance,
                        Description = $"\"{goal.Title}\" yığım qutusu ləğv edildi və qalıq məbləğ geri qaytarıldı"
                    };
                    await _transactionRepository.AddAsync(refundTx);
                }
            }

            await _savingsGoalRepository.DeleteAsync(id);
            await _unitOfWork.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            _logger.LogWarning("Yığım qutusu silindi: {UserId}, ID: {GoalId}, Qaytarılan məbləğ: {RefundAmount} AZN",
                userId, id, goal.CurrentAmount);
        }
        catch
        {
            await dbTransaction.RollbackAsync();
            throw;
        }
    }
}