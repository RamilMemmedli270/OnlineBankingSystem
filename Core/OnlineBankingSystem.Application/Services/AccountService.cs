using AutoMapper;
using Microsoft.Extensions.Logging;
using OnlineBankingSystem.Contract.Abstractions;
using OnlineBankingSystem.Contract.Dtos;
using OnlineBankingSystem.Contract.Dtos.Account;
using OnlineBankingSystem.Domain.Entities;
using OnlineBankingSystem.Domain.Enums;
using OnlineBankingSystem.Domain.Repositories;
namespace OnlineBankingSystem.Application.Services;
public class AccountService : IAccountService
{
    private readonly IAccountRepository _accountRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;
    private readonly ILogger<AccountService> _logger;

    public AccountService(IAccountRepository accountRepository, IUnitOfWork unitOfWork, IMapper mapper, ILogger<AccountService> logger)
    {
        _accountRepository = accountRepository;
        _unitOfWork = unitOfWork;
        _mapper = mapper;
        _logger = logger;
    }
    public async Task<IEnumerable<AccountDto>> GetAllAsync()
    {
        var accounts = await _accountRepository.GetAllAsync();
        return _mapper.Map<IEnumerable<AccountDto>>(accounts);
    }
    public async Task<AccountDto?> GetByIdAsync(string userId, int id)
    {
        var account = await _accountRepository.GetByIdAsync(id);
        if (account == null)
            return null;
        if (account.UserId != userId)
            throw new Exception("Bu hesabın məlumatlarına baxmaq icazəniz yoxdur");
        return _mapper.Map<AccountDto>(account);
    }
    public async Task<IEnumerable<AccountDto>> GetByUserIdAsync(string userId)
    {
        var accounts = await _accountRepository.GetByUserIdAsync(userId);
        return _mapper.Map<IEnumerable<AccountDto>>(accounts);
    }
    public async Task<AccountDto> CreateAsync(string userId, CreateAccountDto dto)
    {
        var account = _mapper.Map<Account>(dto);
        account.UserId = userId;
        account.AccountNumber = await GenerateUniqueAccountNumberAsync();
        account.Balance = 0;
        account.Status = AccountStatus.Active;
        await _accountRepository.AddAsync(account);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Yeni hesab yaradıldı: {UserId}, Hesab: {AccountNumber}", userId, account.AccountNumber);

        return _mapper.Map<AccountDto>(account);
    }
    public async Task UpdateStatusAsync(int id, UpdateAccountStatusDto dto)
    {
        var account = await _accountRepository.GetByIdAsync(id);
        if (account == null)
            throw new Exception("Hesab tapılmadı");
        account.Status = dto.Status;
        await _accountRepository.UpdateAsync(account);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogWarning("Hesab statusu dəyişdi: Hesab ID {AccountId}, Yeni status: {Status}", id, dto.Status);
    }
    private async Task<string> GenerateUniqueAccountNumberAsync()
    {
        string accountNumber;
        Account? existing;
        var random = new Random();
        do
        {
            string digits = "";
            for (int i = 0; i < 16; i++) 
            {
                digits += random.Next(0, 10).ToString();
            }
            accountNumber = digits;
            existing = await _accountRepository.GetByAccountNumberAsync(accountNumber);
        }
        while (existing != null);

        return accountNumber;
    }
}