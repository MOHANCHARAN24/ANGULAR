var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:4200", "https://localhost:4200"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");

var tasks = new List<TaskItem>
{
    new(Guid.NewGuid(), "Create API", "Set up initial task endpoints", false, DateTime.UtcNow.AddDays(2), "High", DateTime.UtcNow),
    new(Guid.NewGuid(), "Build UI", "Connect Angular app to backend", false, DateTime.UtcNow.AddDays(4), "Medium", DateTime.UtcNow)
};

app.MapGet("/api/tasks", () =>
{
    return Results.Ok(tasks.OrderBy(t => t.IsCompleted).ThenBy(t => t.DueDate));
})
.WithName("GetTasks");

app.MapGet("/api/tasks/{id:guid}", (Guid id) =>
{
    var task = tasks.FirstOrDefault(t => t.Id == id);
    return task is null ? Results.NotFound() : Results.Ok(task);
})
.WithName("GetTaskById");

app.MapPost("/api/tasks", (CreateTaskRequest request) =>
{
    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest("Title is required.");
    }

    var task = new TaskItem(
        Guid.NewGuid(),
        request.Title.Trim(),
        request.Description?.Trim(),
        false,
        request.DueDate,
        string.IsNullOrWhiteSpace(request.Priority) ? "Medium" : request.Priority.Trim(),
        DateTime.UtcNow);

    tasks.Add(task);
    return Results.Created($"/api/tasks/{task.Id}", task);
})
.WithName("CreateTask");

app.MapPut("/api/tasks/{id:guid}", (Guid id, UpdateTaskRequest request) =>
{
    var index = tasks.FindIndex(t => t.Id == id);
    if (index < 0)
    {
        return Results.NotFound();
    }

    if (string.IsNullOrWhiteSpace(request.Title))
    {
        return Results.BadRequest("Title is required.");
    }

    var existing = tasks[index];
    var updated = existing with
    {
        Title = request.Title.Trim(),
        Description = request.Description?.Trim(),
        IsCompleted = request.IsCompleted,
        DueDate = request.DueDate,
        Priority = string.IsNullOrWhiteSpace(request.Priority) ? existing.Priority : request.Priority.Trim()
    };

    tasks[index] = updated;
    return Results.Ok(updated);
})
.WithName("UpdateTask");

app.MapPatch("/api/tasks/{id:guid}/toggle", (Guid id) =>
{
    var index = tasks.FindIndex(t => t.Id == id);
    if (index < 0)
    {
        return Results.NotFound();
    }

    var existing = tasks[index];
    var updated = existing with { IsCompleted = !existing.IsCompleted };
    tasks[index] = updated;
    return Results.Ok(updated);
})
.WithName("ToggleTaskStatus");

app.MapDelete("/api/tasks/{id:guid}", (Guid id) =>
{
    var removed = tasks.RemoveAll(t => t.Id == id);
    return removed == 0 ? Results.NotFound() : Results.NoContent();
})
.WithName("DeleteTask");

app.Run();

record TaskItem(
    Guid Id,
    string Title,
    string? Description,
    bool IsCompleted,
    DateTime? DueDate,
    string Priority,
    DateTime CreatedAt);

record CreateTaskRequest(
    string Title,
    string? Description,
    DateTime? DueDate,
    string? Priority);

record UpdateTaskRequest(
    string Title,
    string? Description,
    bool IsCompleted,
    DateTime? DueDate,
    string? Priority);
