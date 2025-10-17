import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, CheckCircle, Circle, Calendar, Clock } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Skeleton } from "../ui/skeleton";
import { toast } from "sonner";
import {
  listMyTodos as apiListMyTodos,
  createTodo as apiCreateTodo,
  updateTodo as apiUpdateTodo,
  deleteTodo as apiDeleteTodo,
  TodoOut,
} from "../../lib/api";

/**
 * MY TODOS SCREEN (User Dashboard)
 * 
 * API Endpoints:
 * 
 * 1. List Todos: GET /todos
 *    Headers: Authorization: Bearer <access_token>
 *    Response: Array of todos
 *    [
 *      {
 *        "id": 1,
 *        "title": "Task title",
 *        "description": "Task description",
 *        "done": false,
 *        "created_at": "2024-01-01T00:00:00Z",
 *        "updated_at": "2024-01-01T00:00:00Z"
 *      }
 *    ]
 * 
 * 2. Create Todo: POST /todos
 *    Headers: Authorization: Bearer <access_token>
 *    Body (JSON):
 *    {
 *      "title": "New task",
 *      "description": "Task description"
 *    }
 * 
 * 3. Update Todo: PATCH /todos/{id}
 *    Headers: Authorization: Bearer <access_token>
 *    Body (JSON - partial):
 *    {
 *      "title": "Updated title",     // optional
 *      "description": "Updated desc", // optional
 *      "done": true                   // optional
 *    }
 * 
 * 4. Delete Todo: DELETE /todos/{id}
 *    Headers: Authorization: Bearer <access_token>
 * 
 * Error Handling:
 * - 401: Unauthorized (invalid/expired token)
 * - 403: Forbidden (not your todo)
 * - 404: Todo not found
 * - 500: Server error
 */

interface Todo {
  id: number;
  title: string;
  description: string;
  done: boolean;
  created_at: string;
  updated_at: string;
}

// No mock data; load from API

export function MyTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "" });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const items: TodoOut[] = await apiListMyTodos();
        // map TodoOut to local Todo type if needed (same fields here)
        setTodos(items as any);
      } catch (err: any) {
        const msg = err?.data?.detail || err?.message || "Failed to load todos";
        toast.error(String(msg));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleCreateTodo = async () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return;
    }

    setLoading(true);
    try {
      const created = await apiCreateTodo({
        title: formData.title,
        description: formData.description,
      });
      setTodos([created as any, ...todos]);
      setCreateDialogOpen(false);
      setFormData({ title: "", description: "" });
      toast.success("Task created successfully");
    } catch (err: any) {
      const msg = err?.data?.detail || err?.message || "Failed to create todo";
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTodo = async () => {
    if (!selectedTodo) return;
    setLoading(true);
    try {
      const updated = await apiUpdateTodo(selectedTodo.id, {
        title: formData.title,
        description: formData.description,
      });
      setTodos(
        todos.map((t) => (t.id === selectedTodo.id ? (updated as any) : t))
      );
      setEditDialogOpen(false);
      setSelectedTodo(null);
      setFormData({ title: "", description: "" });
      toast.success("Task updated successfully");
    } catch (err: any) {
      const msg = err?.data?.detail || err?.message || "Failed to update todo";
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDone = async (todo: Todo) => {
    const nextDone = !todo.done;
    // optimistic update
    setTodos(todos.map((t) => (t.id === todo.id ? { ...t, done: nextDone } : t)));
    try {
      await apiUpdateTodo(todo.id, { done: nextDone });
    } catch (err: any) {
      const msg = err?.data?.detail || err?.message || "Failed to toggle todo";
      toast.error(String(msg));
      // revert on error
      setTodos(todos.map((t) => (t.id === todo.id ? { ...t, done: !nextDone } : t)));
    }
  };

  const handleDeleteTodo = async () => {
    if (!selectedTodo) return;
    setLoading(true);
    try {
      await apiDeleteTodo(selectedTodo.id);
      setTodos(todos.filter((t) => t.id !== selectedTodo.id));
      setDeleteDialogOpen(false);
      setSelectedTodo(null);
      toast.success("Task deleted successfully");
    } catch (err: any) {
      const msg = err?.data?.detail || err?.message || "Failed to delete todo";
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (todo: Todo) => {
    setSelectedTodo(todo);
    setFormData({ title: todo.title, description: todo.description });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (todo: Todo) => {
    setSelectedTodo(todo);
    setDeleteDialogOpen(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-6xl mx-auto pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-text-900 mb-1">My Todos</h1>
          <p className="text-text-600">
            Manage your personal tasks and track progress
          </p>
        </div>
        <Button
          onClick={() => {
            setFormData({ title: "", description: "" });
            setCreateDialogOpen(true);
          }}
          className="bg-primary hover:bg-primary-600"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Task
        </Button>
      </div>

      {/* Loading State */}
      {loading && todos.length === 0 && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-4 w-1/2" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && todos.length === 0 && (
        <Card className="p-12 text-center">
          <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Circle className="w-12 h-12 text-text-600" />
          </div>
          <h3 className="text-text-900 mb-2">Nothing planted yet</h3>
          <p className="text-text-600 mb-6">
            Add your first task to get started 🌱
          </p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-primary hover:bg-primary-600"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Task
          </Button>
        </Card>
      )}

      {/* Todos List */}
      <div className="space-y-4">
        {todos.map((todo) => (
          <Card key={todo.id} className="p-6 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-4">
              {/* Checkbox */}
              <Checkbox
                checked={todo.done}
                onCheckedChange={() => handleToggleDone(todo)}
                className="mt-1"
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3
                  className={`text-text-900 mb-1 ${
                    todo.done ? "line-through text-text-600" : ""
                  }`}
                >
                  {todo.title}
                </h3>
                <p
                  className={`text-text-600 text-sm mb-3 ${
                    todo.done ? "line-through" : ""
                  }`}
                >
                  {todo.description}
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-text-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Created: {formatDate(todo.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Updated: {formatDate(todo.updated_at)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(todo)}
                  className="text-primary hover:text-primary-600 hover:bg-primary/10"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDeleteDialog(todo)}
                  className="text-error-500 hover:text-error-500 hover:bg-error-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog
        open={createDialogOpen || editDialogOpen}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditDialogOpen(false);
            setFormData({ title: "", description: "" });
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createDialogOpen ? "Create New Task" : "Edit Task"}
            </DialogTitle>
            <DialogDescription>
              {createDialogOpen
                ? "Add a new task to your list"
                : "Update task details"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Task title"
                className="border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Task description"
                rows={4}
                className="border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialogOpen(false);
                setEditDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={createDialogOpen ? handleCreateTodo : handleUpdateTodo}
              disabled={loading}
              className="bg-primary hover:bg-primary-600"
            >
              {loading ? "Saving..." : createDialogOpen ? "Create" : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTodo?.title}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTodo}
              className="bg-error-500 hover:bg-error-500/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* FAB for Mobile */}
      <Button
        onClick={() => {
          setFormData({ title: "", description: "" });
          setCreateDialogOpen(true);
        }}
        className="lg:hidden fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg bg-primary hover:bg-primary-600"
        size="icon"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}
