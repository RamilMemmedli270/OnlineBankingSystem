using AutoMapper;
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

    public AccountService(IAccountRepository accountRepository, IUnitOfWork unitOfWork, IMapper mapper)
    {
        _accountRepository = accountRepository;
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    public async Task<IEnumerable<AccountDto>> GetAllAsync()
    {
        var accounts = await _accountRepository.GetAllAsync();
        return _mapper.Map<IEnumerable<AccountDto>>(accounts);
    }

    public async Task<AccountDto?> GetByIdAsync(int id)
    {
        var account = await _accountRepository.GetByIdAsync(id);
        return account == null ? null : _mapper.Map<AccountDto>(account);
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
    }

    private async Task<string> GenerateUniqueAccountNumberAsync()
    {
        string accountNumber;
        Account? existing;
        do
        {
            accountNumber = "AZ" + Guid.NewGuid().ToString("N").Substring(0, 10).ToUpper();
            existing = await _accountRepository.GetByAccountNumberAsync(accountNumber);
        }
        while (existing != null);

        return accountNumber;
    }
}