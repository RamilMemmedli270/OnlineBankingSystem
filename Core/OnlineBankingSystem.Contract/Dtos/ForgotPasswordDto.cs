namespace OnlineBankingSystem.Contract.Dtos;

public record ForgotPasswordDto
{
    public string Email { get; init; } = string.Empty;
}
