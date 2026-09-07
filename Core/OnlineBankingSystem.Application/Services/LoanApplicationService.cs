using AutoMapper;
using Microsoft.Extensions.Logging;
using OnlineBankingSystem.Contract.Abstractions;
using OnlineBankingSystem.Contract.Dtos;
using OnlineBankingSystem.Contract.Dtos.LoanApplication;
using OnlineBankingSystem.Domain.Entities;
using OnlineBankingSystem.Domain.Enums;
using OnlineBankingSystem.Domain.Repositories;

namespace OnlineBankingSystem.Application.Services;

public class LoanApplicationService : ILoanApplicationService
{
    private readonly ILoanApplicationRepository _loanRepository;
    private readonly IAccountRepository _accountRepository;
    private readonly ITransactionRepository _transactionRepository;
    private readonly INotificationRepository _notificationRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<LoanApplicationService> _logger;

    public LoanApplicationService(
        ILoanApplicationRepository loanRepository,
        IAccountRepository accountRepository,
        ITransactionRepository transactionRepository,
        INotificationRepository notificationRepository,
        IUnitOfWork unitOfWork,
        IMapper mapper,
        ILogger<LoanApplicationService> logger)
    {
        _loanRepository = loanRepository;
        _accountRepository = accountRepository;
        _transactionRepository = transactionRepository;
        _notificationRepository = notificationRepository;
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<LoanApplicationDto> ApplyAsync(string userId, CreateLoanDto dto)
    {
        // 1. Məbləğ və Müddət limitləri yoxlanılır
        if (dto.Amount < 100 || dto.Amount > 50000)
            throw new Exception("Kredit məbləği minimum 100 AZN, maksimum 50,000 AZN ola bilər.");

        if (dto.Term < 3 || dto.Term > 48)
            throw new Exception("Kredit müddəti minimum 3 ay, maksimum 48 ay ola bilər.");

        // 2. İstifadəçinin artıq gözləyən (Pending) və ya aktiv/təsdiqlənmiş (Approved) krediti olub-olmaması yoxlanılır
        var existingLoans = await _loanRepository.GetByUserIdAsync(userId);
        if (existingLoans.Any(l => l.Status == LoanStatus.Pending))
            throw new Exception("Sizin artıq baxılmaqda olan müraciətiniz var. Zəhmət olmasa admin qərarını gözləyin.");

        if (existingLoans.Any(l => l.Status == LoanStatus.Approved))
            throw new Exception("Sizin artıq aktiv kreditiniz mövcuddur. Yeni kredit müraciəti göndərə bilməzsiniz.");

        var loan = _mapper.Map<LoanApplication>(dto);
        loan.UserId = userId;
        loan.Status = LoanStatus.Pending;

        await _loanRepository.AddAsync(loan);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Yeni kredit müraciəti göndərildi: {UserId}, Məbləğ: {Amount} AZN, Müddət: {Term} ay", userId, dto.Amount, dto.Term);

        return _mapper.Map<LoanApplicationDto>(loan);
    }

    public async Task<IEnumerable<LoanApplicationDto>> GetByUserIdAsync(string userId)
    {
        var loans = await _loanRepository.GetByUserIdAsync(userId);
        return _mapper.Map<IEnumerable<LoanApplicationDto>>(loans);
    }

    public async Task<IEnumerable<LoanApplicationDto>> GetAllAsync()
    {
        var loans = await _loanRepository.GetAllAsync();
        return _mapper.Map<IEnumerable<LoanApplicationDto>>(loans);
    }

    public async Task<IEnumerable<LoanApplicationDto>> GetPendingAsync()
    {
        var loans = await _loanRepository.GetByStatusAsync(LoanStatus.Pending);
        return _mapper.Map<IEnumerable<LoanApplicationDto>>(loans);
    }

    public async Task<LoanApplicationDto> ReviewAsync(int id, string adminId, ReviewLoanDto dto)
    {
        if (dto.Status != LoanStatus.Approved && dto.Status != LoanStatus.Declined)
            throw new Exception("Status yalnız Təsdiq (Approved) və ya İmtina (Declined) ola bilər.");

        var loan = await _loanRepository.GetByIdAsync(id);
        if (loan == null)
            throw new Exception("Kredit müraciəti tapılmadı.");

        if (loan.Status != LoanStatus.Pending)
            throw new Exception("Bu müraciət artıq nəzərdən keçirilib.");

        await using var dbTransaction = await _unitOfWork.BeginTransactionAsync();
        try
        {
            loan.Status = dto.Status;
            loan.ReviewedAt = DateTime.UtcNow;
            loan.ReviewedBy = adminId;

            if (dto.Status == LoanStatus.Approved)
            {
                // İstifadəçinin aktiv cari (Current) və ya əsas hesabını tapırıq
                var userAccounts = await _accountRepository.GetByUserIdAsync(loan.UserId);
                var targetAccount = userAccounts.FirstOrDefault(a => a.AccountType == AccountType.Current && a.Status == AccountStatus.Active)
                                 ?? userAccounts.FirstOrDefault(a => a.Status == AccountStatus.Active);

                if (targetAccount == null)
                    throw new Exception("Kredit məbləğinin köçürülməsi üçün istifadəçinin aktiv hesabı tapılmadı.");

                // Pulu hesaba köçürürük
                targetAccount.Balance += loan.Amount;
                await _accountRepository.UpdateAsync(targetAccount);

                // Əməliyyat tarixçəsinə Mədaxil (Deposit) olaraq qeyd edirik
                var transaction = new Transaction
                {
                    ToAccountId = targetAccount.Id,
                    Amount = loan.Amount,
                    TransactionType = TransactionType.Deposit,
                    ToBalanceSnapshot = targetAccount.Balance,
                    Description = $"Təsdiqlənmiş Kredit (#{loan.Id}) mədaxili"
                };
                await _transactionRepository.AddAsync(transaction);

                // İstifadəçiyə təbrik və bildiriş göndəririk
                var notification = new Notification
                {
                    UserId = loan.UserId,
                    Title = "Kreditiniz Təsdiqləndi! 🎉",
                    Message = $"{loan.Amount:N2} AZN məbləğində kreditiniz təsdiqləndi və {targetAccount.AccountNumber} nömrəli hesabınıza köçürüldü.",
                    Type = NotificationType.LoanStatus,
                    IsRead = false
                };
                await _notificationRepository.AddAsync(notification);
            }
            else if (dto.Status == LoanStatus.Declined)
            {
                loan.RejectionReason = dto.RejectionReason;

                var reasonText = !string.IsNullOrWhiteSpace(dto.RejectionReason)
                    ? $"\nİmtina səbəbi: {dto.RejectionReason}"
                    : string.Empty;

                var notification = new Notification
                {
                    UserId = loan.UserId,
                    Title = "Kredit Müraciətinizə İmtina Edildi",
                    Message = $"{loan.Amount:N2} AZN məbləğində kredit müraciətiniz rədd edildi.{reasonText}",
                    Type = NotificationType.LoanStatus,
                    IsRead = false
                };
                await _notificationRepository.AddAsync(notification);
            }

            await _loanRepository.UpdateAsync(loan);
            await _unitOfWork.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            _logger.LogWarning("Kredit müraciəti yekunlaşdırıldı: ID {LoanId}, Admin: {AdminId}, Qərar: {Status}", id, adminId, dto.Status);

            return _mapper.Map<LoanApplicationDto>(loan);
        }
        catch
        {
            await dbTransaction.RollbackAsync();
            throw;
        }
    }
}