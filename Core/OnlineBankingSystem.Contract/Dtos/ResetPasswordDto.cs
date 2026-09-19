namespace OnlineBankingSystem.Contract.Dtos;

public record ResetPasswordDto
{
    public string Email { get; init; } = string.Empty;
    public string OtpCode { get; init; } = string.Empty;
    public string NewPassword { get; init; } = string.Empty;
}
