using AutoMapper;
using OnlineBankingSystem.Contract.Dtos;
using OnlineBankingSystem.Contract.Dtos.Account;
using OnlineBankingSystem.Contract.Dtos.LoanApplication;
using OnlineBankingSystem.Contract.Dtos.Transaction;
using OnlineBankingSystem.Domain.Entities;

namespace OnlineBankingSystem.Application.Mapper;

public class CustomProfile : Profile
{
    public CustomProfile()
    {
        CreateMap<Account, AccountDto>();
        CreateMap<CreateAccountDto, Account>();

        CreateMap<Transaction, TransactionDto>();

        CreateMap<LoanApplication, LoanApplicationDto>();
        CreateMap<CreateLoanDto, LoanApplication>();

        CreateMap<Notification, NotificationDto>();

        CreateMap<BalanceAlertSetting, BalanceAlertSettingDto>();

        CreateMap<AppUser, UserDto>()
            .ForMember(dest => dest.Roles, opt => opt.Ignore());

        CreateMap<RegisterDto, AppUser>()
            .ForMember(dest => dest.UserName, opt => opt.MapFrom(src => src.UserName))
            .ForMember(dest => dest.Email, opt => opt.MapFrom(src => src.Email));
    }
}