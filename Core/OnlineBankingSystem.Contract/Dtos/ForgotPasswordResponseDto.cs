namespace OnlineBankingSystem.Contract.Dtos;

public record ForgotPasswordResponseDto
{
    public string Message { get; init; } = string.Empty;
}
