using OnlineBankingSystem.Contract.Dtos;

namespace OnlineBankingSystem.Contract.Abstractions;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
    Task<AuthResponseDto> LoginAsync(LoginDto dto);
}