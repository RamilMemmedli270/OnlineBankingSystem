namespace OnlineBankingSystem.Contract.Dtos;

public record UserDto 

{
    public string Id { get; set; } = string.Empty;
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string PhoneNumber { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public IEnumerable<string> Roles { get; init; } = new List<string>();
}