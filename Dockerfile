# ---------------------------------------------------
# Stage 1: React フロントエンドのビルド
# ---------------------------------------------------
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ---------------------------------------------------
# Stage 2: C# バックエンドのビルド
# ---------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS backend-build
WORKDIR /app/backend

COPY backend/*.csproj ./
RUN dotnet restore

COPY backend/ ./
RUN dotnet publish -c Release -o /app/publish

# ---------------------------------------------------
# Stage 3: 本番実行環境（軽量ランタイム）
# ---------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# C# のビルド成果物を配置
COPY --from=backend-build /app/publish ./

# React の静的ファイルを C# の wwwroot フォルダへ配置
COPY --from=frontend-build /app/frontend/dist ./wwwroot

# Cloud Run のデフォルトポート (8080) を開放
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "backend.dll"]