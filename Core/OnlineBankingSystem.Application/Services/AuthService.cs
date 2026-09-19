using AutoMapper;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using OnlineBankingSystem.Contract.Abstractions;
using OnlineBankingSystem.Contract.Dtos;
using OnlineBankingSystem.Domain.Entities;
using System.Collections.Concurrent;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace OnlineBankingSystem.Application.Services;

public class AuthService : IAuthService
{
    private static readonly ConcurrentDictionary<string, (string Code, DateTime ExpiresAt)> _otpStore = new(StringComparer.OrdinalIgnoreCase);

    private readonly UserManager<AppUser> _userManager;
    private readonly IConfiguration _configuration;
    private readonly IMapper _mapper;
    private readonly ILogger<AuthService> _logger;
    private readonly IEmailService _emailService;

    public AuthService(
        UserManager<AppUser> userManager,
        IConfiguration configuration,
        IMapper mapper,
        ILogger<AuthService> logger,
        IEmailService emailService)
    {
        _userManager = userManager;
        _configuration = configuration;
        _mapper = mapper;
        _logger = logger;
        _emailService = emailService;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var existingUser = await _userManager.FindByEmailAsync(dto.Email);
        if (existingUser != null)
            throw new Exception("Bu email artıq istifadə olunur");

        var user = _mapper.Map<AppUser>(dto);

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new Exception(errors);
        }

        var roleResult = await _userManager.AddToRoleAsync(user, "Customer");
        if (!roleResult.Succeeded)
        {
            var errors = string.Join(", ", roleResult.Errors.Select(e => e.Description));
            throw new Exception($"İstifadəçi yaradıldı, amma rol təyin edilmədi: {errors}");
        }
        _logger.LogInformation("Yeni istifadəçi qeydiyyatdan keçdi: {Email}", dto.Email);
        return await GenerateAuthResponseAsync(user, false);
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email) 
                   ?? await _userManager.FindByNameAsync(dto.Email);
        if (user == null)
            throw new Exception("Email və ya şifrə yanlışdır");

        var isPasswordValid = await _userManager.CheckPasswordAsync(user, dto.Password);
        if (!isPasswordValid)
            throw new Exception("Email və ya şifrə yanlışdır");

        _logger.LogInformation("İstifadəçi login oldu: {Email}", dto.Email);

        return await GenerateAuthResponseAsync(user, dto.RememberMe);
    }

    public async Task<ForgotPasswordResponseDto> ForgotPasswordAsync(ForgotPasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
            throw new Exception("Email ünvanı daxil edilməlidir");

        var user = await _userManager.FindByEmailAsync(dto.Email.Trim())
                   ?? await _userManager.FindByNameAsync(dto.Email.Trim());

        if (user == null)
            throw new Exception("Bu email ünvanı ilə qeydiyyatdan keçmiş istifadəçi tapılmadı");

        // 6 rəqəmli OTP kod generasiya edirik (100000 - 999999)
        var otpCode = Random.Shared.Next(100000, 999999).ToString();
        var expiresAt = DateTime.UtcNow.AddMinutes(10);

        _otpStore[dto.Email.Trim()] = (otpCode, expiresAt);

        _logger.LogInformation("Şifrə bərpası üçün OTP kodu yaradıldı: {Email}", dto.Email);

        // İstifadəçinin şəxsi poçt qutusuna göndərilən bank şablonlu email
        var emailHtml = $@"
        <div style='font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;'>
            <div style='text-align: center; margin-bottom: 25px;'>
                <h2 style='color: #059669; margin: 0; font-size: 24px; font-weight: bold;'>OnlineBank</h2>
                <p style='color: #64748b; font-size: 13px; margin-top: 4px;'>Təhlükəsiz Şifrə Sıfırlama</p>
            </div>
            <div style='background-color: #f8fafc; padding: 25px; border-radius: 12px; text-align: center; border: 1px solid #e2e8f0;'>
                <p style='font-size: 15px; color: #1e293b; margin-top: 0;'>Salam, <strong>{user.FirstName} {user.LastName}</strong>!</p>
                <p style='color: #475569; font-size: 14px; line-height: 1.5;'>Hesabınızın şifrəsini bərpa etmək üçün təsdiq kodunuz:</p>
                <div style='font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #059669; padding: 14px 20px; margin: 20px 0; background: #ecfdf5; border: 2px dashed #059669; border-radius: 10px; display: inline-block;'>
                    {otpCode}
                </div>
                <p style='color: #64748b; font-size: 12px; margin-bottom: 0;'>⚠️ Bu kod <strong>10 dəqiqə</strong> ərzində etibarlıdır. Təhlükəsizliyiniz üçün kodu heç kimlə bölüşməyin.</p>
            </div>
            <div style='text-align: center; margin-top: 25px; color: #94a3b8; font-size: 12px;'>
                Bu sorğunu siz göndərməmisinizsə, zəhmət olmasa bu məktubu nəzərə almayın.<br>
                &copy; 2026 Online Banking System. Bütün hüquqlar qorunur.
            </div>
        </div>";

        await _emailService.SendEmailAsync(dto.Email.Trim(), "Şifrə Bərpası üçün Təsdiq Kodu — OnlineBank", emailHtml);

        return new ForgotPasswordResponseDto
        {
            Message = "Təsdiq kodu email ünvanınıza göndərildi"
        };
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
            throw new Exception("Email ünvanı daxil edilməlidir");

        if (string.IsNullOrWhiteSpace(dto.OtpCode))
            throw new Exception("Təsdiq kodu daxil edilməlidir");

        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
            throw new Exception("Yeni şifrə ən azı 6 simvoldan ibarət olmalıdır");

        var emailKey = dto.Email.Trim();

        if (!_otpStore.TryGetValue(emailKey, out var storedOtp))
            throw new Exception("Təsdiq kodu tapılmadı və ya vaxtı keçib. Zəhmət olmasa yenidən kod tələb edin");

        if (DateTime.UtcNow > storedOtp.ExpiresAt)
        {
            _otpStore.TryRemove(emailKey, out _);
            throw new Exception("Təsdiq kodunun vaxtı bitib. Zəhmət olmasa yenidən kod tələb edin");
        }

        if (storedOtp.Code != dto.OtpCode.Trim())
            throw new Exception("Daxil edilən təsdiq kodu yanlışdır");

        var user = await _userManager.FindByEmailAsync(emailKey)
                   ?? await _userManager.FindByNameAsync(emailKey);

        if (user == null)
            throw new Exception("İstifadəçi tapılmadı");

        var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, resetToken, dto.NewPassword);

        if (!result.Succeeded)
        {
            var errors = string.Join(", ", result.Errors.Select(e => e.Description));
            throw new Exception(errors);
        }

        _otpStore.TryRemove(emailKey, out _);
        _logger.LogInformation("İstifadəçi şifrəsini uğurla sıfırladı: {Email}", dto.Email);

        return true;
    }

    private async Task<AuthResponseDto> GenerateAuthResponseAsync(AppUser user, bool rememberMe)
    {
        var roles = await _userManager.GetRolesAsync(user);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(ClaimTypes.Name, $"{user.FirstName} {user.LastName}")
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var jwtSettings = _configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expires = rememberMe ? DateTime.UtcNow.AddDays(30) : DateTime.UtcNow.AddHours(2);

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: expires,
            signingCredentials: credentials
        );

        return new AuthResponseDto
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            ExpiresAt = expires,
            UserId = user.Id,
            Email = user.Email ?? string.Empty,
            FullName = $"{user.FirstName} {user.LastName}",
            Roles = roles
        };
    }
}