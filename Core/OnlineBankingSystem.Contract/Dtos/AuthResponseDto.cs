namespace OnlineBankingSystem.Contract.Dtos;

public record AuthResponseDto
{
    public string Token { get; init; } = string.Empty;
    public DateTime ExpiresAt { get; init; }
    public string UserId { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string FullName { get; init; } = string.Empty;
    public IEnumerable<string> Roles { get; init; } = new List<string>();
}