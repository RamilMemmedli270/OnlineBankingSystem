namespace OnlineBankingSystem.Contract.Dtos;

public record BaseDto
{
    public int Id { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
