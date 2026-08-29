# See https://aka.ms/customizecontainer to learn how to customize your debug container and how Visual Studio uses this Dockerfile to build your images for faster debugging.

# This stage is used when running from VS in fast mode (Default for Debug configuration)
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
USER $APP_UID
WORKDIR /app
EXPOSE 8080
EXPOSE 8081


# This stage is used to build the service project
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["Presentation/OnlineBankingSystem.WebApi/OnlineBankingSystem.WebApi.csproj", "Presentation/OnlineBankingSystem.WebApi/"]
COPY ["Core/OnlineBankingSystem.Application/OnlineBankingSystem.Application.csproj", "Core/OnlineBankingSystem.Application/"]
COPY ["Core/OnlineBankingSystem.Contract/OnlineBankingSystem.Contract.csproj", "Core/OnlineBankingSystem.Contract/"]
COPY ["Core/OnlineBankingSystem.Domain/OnlineBankingSystem.Domain.csproj", "Core/OnlineBankingSystem.Domain/"]
COPY ["Infrastructure/OnlineBankingSystem.Infrastructure/OnlineBankingSystem.Infrastructure.csproj", "Infrastructure/OnlineBankingSystem.Infrastructure/"]
COPY ["Infrastructure/OnlineBankingSystem.Persistence/OnlineBankingSystem.Persistence.csproj", "Infrastructure/OnlineBankingSystem.Persistence/"]
RUN dotnet restore "./Presentation/OnlineBankingSystem.WebApi/OnlineBankingSystem.WebApi.csproj"
COPY . .
WORKDIR "/src/Presentation/OnlineBankingSystem.WebApi"
RUN dotnet build "./OnlineBankingSystem.WebApi.csproj" -c $BUILD_CONFIGURATION -o /app/build

# This stage is used to publish the service project to be copied to the final stage
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "./OnlineBankingSystem.WebApi.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

# This stage is used in production or when running from VS in regular mode (Default when not using the Debug configuration)
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "OnlineBankingSystem.WebApi.dll"]