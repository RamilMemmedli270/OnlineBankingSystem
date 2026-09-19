namespace OnlineBankingSystem.Contract.Abstractions;

public interface IEmailService
{
    Task SendEmailAsync(string toEmail, string subject, string htmlBody);
}
