using Google.Cloud.Firestore;

var builder = WebApplication.CreateBuilder(args);

// CORS設定 (http://localhost:5173 を許可)
var corsPolicy = "AllowFrontend";
builder.Services.AddCors(options =>
{
    options.AddPolicy(corsPolicy, policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Firestore初期化 & DIコンテナへの登録
builder.Services.AddSingleton(FirestoreDb.Create("kains-first-project"));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(corsPolicy);
app.UseHttpsRedirection();

// POST /api/score: プレイヤー名とスコアを受け取り game_scores コレクションに保存
app.MapPost("/api/score", async (ScoreRequest req, FirestoreDb db) =>
{
    if (string.IsNullOrWhiteSpace(req.Player))
    {
        return Results.BadRequest(new { error = "Player name is required." });
    }

    var collection = db.Collection("game_scores");
    var doc = await collection.AddAsync(new Dictionary<string, object>
    {
        { "player", req.Player },
        { "score", req.Score },
        { "createdAt", Timestamp.GetCurrentTimestamp() }
    });

    return Results.Ok(new { id = doc.Id, message = "Score saved successfully." });
})
.WithName("SaveScore")
.WithOpenApi();

// GET /api/scores: game_scores コレクションからスコア上位5件を取得
app.MapGet("/api/scores", async (FirestoreDb db) =>
{
    var collection = db.Collection("game_scores");
    var query = collection.OrderByDescending("score").Limit(5);
    var snapshot = await query.GetSnapshotAsync();

    var scores = snapshot.Documents.Select(doc =>
    {
        var data = doc.ToDictionary();
        return new
        {
            id = doc.Id,
            player = data.TryGetValue("player", out var p) ? p?.ToString() : "",
            score = data.TryGetValue("score", out var s) ? Convert.ToInt32(s) : 0
        };
    });

    return Results.Ok(scores);
})
.WithName("GetTopScores")
.WithOpenApi();

app.Run();

public record ScoreRequest(string Player, int Score);
