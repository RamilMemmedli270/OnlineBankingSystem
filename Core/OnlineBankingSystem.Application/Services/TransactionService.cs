using AutoMapper;
using OnlineBankingSystem.Contract.Abstractions;
using OnlineBankingSystem.Contract.Dtos;
using OnlineBankingSystem.Contract.Dtos.Transaction;
using OnlineBankingSystem.Domain.Entities;
using OnlineBankingSystem.Domain.Enums;
using OnlineBankingSystem.Domain.Repositories;

namespace OnlineBankingSystem.Application.Services;

public class TransactionService : ITransactionService
{
    private readonly ITransactionRepository _transactionRepository;
    private readonly IAccountRepository _accountRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly INotificationService _notificationService;
    private readonly IMapper _mapper;

    public TransactionService(
        ITransactionRepository transactionRepository,
        IAccountRepository accountRepository,
        IUnitOfWork unitOfWork,
        INotificationService notificationService,
        IMapper mapper)
    {
        _transactionRepository = transactionRepository;
        _accountRepository = accountRepository;
        _unitOfWork = unitOfWork;
        _notificationService = notificationService;
        _mapper = mapper;
    }

    public async Task<TransactionDto> TransferAsync(string userId, TransferDto dto)
    {
        var fromAccount = await _accountRepository.GetByIdAsync(dto.FromAccountId);
        if (fromAccount == null)
            throw new Exception("Göndərən hesab tapılmadı");

        if (fromAccount.UserId != userId)
            throw new Exception("Bu hesab sizə aid deyil");

        if (fromAccount.Status == AccountStatus.Frozen)
            throw new Exception("Bu hesab dondurulub, əməliyyat aparıla bilməz");

        var toAccount = await _accountRepository.GetByAccountNumberAsync(dto.ToAccountNumber);
        if (toAccount == null)
            throw new Exception("Alan hesab tapılmadı");

        if (toAccount.Status == AccountStatus.Frozen)
            throw new Exception("Alan hesab dondurulub, əməliyyat aparıla bilməz");

        if (fromAccount.Id == toAccount.Id)
            throw new Exception("Eyni hesaba köçürmə edə bilməzsiniz");

        if (dto.Amount <= 0)
            throw new Exception("Məbləğ 0-dan böyük olmalıdır");

        if (fromAccount.Balance < dto.Amount)
            throw new Exception("Balans kifayət etmir");

        await using var dbTransaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            fromAccount.Balance -= dto.Amount;
            toAccount.Balance += dto.Amount;

            await _accountRepository.UpdateAsync(fromAccount);
            await _accountRepository.UpdateAsync(toAccount);

            var transaction = new Transaction
            {
                FromAccountId = fromAccount.Id,
                ToAccountId = toAccount.Id,
                Amount = dto.Amount,
                TransactionType = TransactionType.Transfer,
                FromBalanceSnapshot = fromAccount.Balance,
                ToBalanceSnapshot = toAccount.Balance
            };

            await _transactionRepository.AddAsync(transaction);

            await _notificationService.CheckAndSendLowBalanceAlertAsync(fromAccount.UserId, fromAccount.Balance);

            await _unitOfWork.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            return _mapper.Map<TransactionDto>(transaction);
        }
        catch
        {
            await dbTransaction.RollbackAsync();
            throw;
        }
    }

    public async Task<TransactionDto> DepositAsync(string userId, DepositDto dto)
    {
        var account = await _accountRepository.GetByIdAsync(dto.AccountId);
        if (account == null)
            throw new Exception("Hesab tapılmadı");

        if (account.UserId != userId)
            throw new Exception("Bu hesab sizə aid deyil");

        if (account.Status == AccountStatus.Frozen)
            throw new Exception("Bu hesab dondurulub, əməliyyat aparıla bilməz");

        if (dto.Amount <= 0)
            throw new Exception("Məbləğ 0-dan böyük olmalıdır");

        await using var dbTransaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            account.Balance += dto.Amount;
            await _accountRepository.UpdateAsync(account);

            var transaction = new Transaction
            {
                ToAccountId = account.Id,
                Amount = dto.Amount,
                TransactionType = TransactionType.Deposit,
                ToBalanceSnapshot = account.Balance,
                Description = dto.Description ?? "Balans artırıldı (Deposit)"
            };

            await _transactionRepository.AddAsync(transaction);
            await _unitOfWork.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            return _mapper.Map<TransactionDto>(transaction);
        }
        catch
        {
            await dbTransaction.RollbackAsync();
            throw;
        }
    }

    public async Task<IEnumerable<TransactionDto>> GetByAccountIdAsync(string userId, int accountId)
    {
        var account = await _accountRepository.GetByIdAsync(accountId);
        if (account == null)
            throw new Exception("Hesab tapılmadı");

        if (account.UserId != userId)
            throw new Exception("Bu hesabın məlumatlarına baxmaq icazəniz yoxdur");

        var transactions = await _transactionRepository.GetByAccountIdAsync(accountId);
        return _mapper.Map<IEnumerable<TransactionDto>>(transactions);
    }

    public async Task<IEnumerable<TransactionDto>> GetStatementAsync(string userId, int accountId, DateTime from, DateTime to)
    {
        var account = await _accountRepository.GetByIdAsync(accountId);
        if (account == null)
            throw new Exception("Hesab tapılmadı");

        if (account.UserId != userId)
            throw new Exception("Bu hesabın məlumatlarına baxmaq icazəniz yoxdur");

        var transactions = await _transactionRepository.GetByAccountIdAndDateRangeAsync(accountId, from, to);
        return _mapper.Map<IEnumerable<TransactionDto>>(transactions);
    }
}