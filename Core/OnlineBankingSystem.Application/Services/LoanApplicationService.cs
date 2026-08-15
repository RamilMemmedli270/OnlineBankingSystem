using AutoMapper;
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
    private readonly IUnitOfWork _unitOfWork;
    private readonly IMapper _mapper;

    public LoanApplicationService(
        ILoanApplicationRepository loanRepository,
        IUnitOfWork unitOfWork,
        IMapper mapper)
    {
        _loanRepository = loanRepository;
        _unitOfWork = unitOfWork;
        _mapper = mapper;
    }

    public async Task<LoanApplicationDto> ApplyAsync(string userId, CreateLoanDto dto)
    {
        var loan = _mapper.Map<LoanApplication>(dto);
        loan.UserId = userId;
        loan.Status = LoanStatus.Pending;

        await _loanRepository.AddAsync(loan);
        await _unitOfWork.SaveChangesAsync();

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
        var loan = await _loanRepository.GetByIdAsync(id);
        if (loan == null)
            throw new Exception("Kredit müraciəti tapılmadı");

        if (loan.Status != LoanStatus.Pending)
            throw new Exception("Bu müraciət artıq baxılıb");

        loan.Status = dto.Status;
        loan.ReviewedAt = DateTime.UtcNow;
        loan.ReviewedBy = adminId;

        await _loanRepository.UpdateAsync(loan);
        await _unitOfWork.SaveChangesAsync();

        return _mapper.Map<LoanApplicationDto>(loan);
    }
}