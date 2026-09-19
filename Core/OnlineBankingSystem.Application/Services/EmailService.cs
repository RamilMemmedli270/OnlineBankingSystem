using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using OnlineBankingSystem.Contract.Abstractions;

namespace OnlineBankingSystem.Application.Services;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        var emailSettings = _configuration.GetSection("EmailSettings");
        var host = emailSettings["SmtpServer"] ?? "smtp.gmail.com";
        var port = int.TryParse(emailSettings["Port"], out var p) ? p : 587;
        var senderEmail = emailSettings["SenderEmail"]?.Trim();
        var senderPassword = emailSettings["Password"]?.Replace(" ", "").Trim();
        var senderName = emailSettings["SenderName"] ?? "Online Banking";

        if (string.IsNullOrWhiteSpace(senderEmail) || string.IsNullOrWhiteSpace(senderPassword))
        {
            _logger.LogWarning("EmailSettings tam doldurulmayıb (SenderEmail və ya Password boşdur).");
            return;
        }

        try
        {
            using var client = new SmtpClient(host, port)
            {
                Credentials = new NetworkCredential(senderEmail, senderPassword),
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(senderEmail, senderName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };
            mailMessage.To.Add(toEmail);

            await client.SendMailAsync(mailMessage);
            _logger.LogInformation("Təsdiq kodu uğurla emailə göndərildi: {ToEmail}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Email göndərilərkən xəta baş verdi: {ToEmail}", toEmail);
            throw new Exception($"Email göndərilməsi uğursuz oldu: {ex.Message}");
        }
    }
}
