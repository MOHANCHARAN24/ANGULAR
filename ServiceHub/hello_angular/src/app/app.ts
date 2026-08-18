import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../environments/environment';

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  isCompleted: boolean;
  dueDate?: string | null;
  priority: string;
  createdAt: string;
}

interface CreateTaskRequest {
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority: string;
}

interface UpdateTaskRequest {
  title: string;
  description?: string | null;
  isCompleted: boolean;
  dueDate?: string | null;
  priority: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = `${environment.apiBaseUrl}/tasks`;

  tasks: TaskItem[] = [];
  loading = false;
  errorMessage = '';

  newTask: CreateTaskRequest = {
    title: '',
    description: '',
    dueDate: '',
    priority: 'Medium',
  };

  editingTaskId: string | null = null;
  editTask: UpdateTaskRequest = {
    title: '',
    description: '',
    dueDate: '',
    priority: 'Medium',
    isCompleted: false,
  };

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading = true;
    this.errorMessage = '';

    this.http.get<TaskItem[]>(this.apiBaseUrl).subscribe({
      next: (tasks) => {
        this.tasks = tasks;
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Could not load tasks. Start the .NET API and try again.';
        this.loading = false;
      },
    });
  }

  addTask(): void {
    const title = this.newTask.title.trim();
    if (!title) {
      return;
    }

    const payload: CreateTaskRequest = {
      title,
      description: this.newTask.description?.trim() || null,
      dueDate: this.newTask.dueDate || null,
      priority: this.newTask.priority || 'Medium',
    };

    this.http.post<TaskItem>(this.apiBaseUrl, payload).subscribe({
      next: () => {
        this.newTask = { title: '', description: '', dueDate: '', priority: 'Medium' };
        this.loadTasks();
      },
      error: () => {
        this.errorMessage = 'Could not create task.';
      },
    });
  }

  beginEdit(task: TaskItem): void {
    this.editingTaskId = task.id;
    this.editTask = {
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      priority: task.priority,
      isCompleted: task.isCompleted,
    };
  }

  cancelEdit(): void {
    this.editingTaskId = null;
  }

  saveEdit(taskId: string): void {
    const title = this.editTask.title.trim();
    if (!title) {
      return;
    }

    const payload: UpdateTaskRequest = {
      title,
      description: this.editTask.description?.trim() || null,
      dueDate: this.editTask.dueDate || null,
      priority: this.editTask.priority || 'Medium',
      isCompleted: this.editTask.isCompleted,
    };

    this.http.put<TaskItem>(`${this.apiBaseUrl}/${taskId}`, payload).subscribe({
      next: () => {
        this.editingTaskId = null;
        this.loadTasks();
      },
      error: () => {
        this.errorMessage = 'Could not update task.';
      },
    });
  }

  toggleTask(taskId: string): void {
    this.http.patch<TaskItem>(`${this.apiBaseUrl}/${taskId}/toggle`, {}).subscribe({
      next: () => this.loadTasks(),
      error: () => {
        this.errorMessage = 'Could not change task status.';
      },
    });
  }

  deleteTask(taskId: string): void {
    this.http.delete(`${this.apiBaseUrl}/${taskId}`).subscribe({
      next: () => this.loadTasks(),
      error: () => {
        this.errorMessage = 'Could not delete task.';
      },
    });
  }

  get pendingCount(): number {
    return this.tasks.filter((task) => !task.isCompleted).length;
  }

  get completedCount(): number {
    return this.tasks.filter((task) => task.isCompleted).length;
  }
}
