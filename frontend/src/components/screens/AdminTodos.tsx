import { useEffect, useState } from "react";
import { ListTodo, Trash2, Search, Filter } from "lucide-react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Skeleton } from "../ui/skeleton";
import { toast } from "sonner";
import { adminListTodos, adminDeleteTodo } from "../../lib/api";

/**
 * ADMIN ALL TODOS SCREEN
 * 
 * API Endpoints:
 * 
 * 1. List All Todos: GET /admin/todos
 *    Headers: Authorization: Bearer <access_token>
 *    Note: Requires admin role
 *    Response:
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
 *    Note: Current API response does NOT include owner information.
 *    Future enhancement: Add owner_id and owner_email to response.
 * 
 * 2. Delete Any Todo: DELETE /admin/todos/{todo_id}
 *    Headers: Authorization: Bearer <access_token>
 *    Note: Admin can delete any user's todo
 * 
 * Client-Side Features (not in API yet):
 * - Filter by status (All/Done/Active)
 * - Search by title/description
 * - Pagination controls (UI only, API can add later)
 * 
 * Error Handling:
 * - 401: Unauthorized
 * - 403: Forbidden (not admin)
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
  owner: {
    id: number;
    email: string;
  };
}

// Data is loaded from API

export function AdminTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "done" | "active">("all");
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await adminListTodos();
        setTodos(data as any);
      } catch (err: any) {
        const msg = err?.data?.detail || err?.message || "Failed to load todos";
        toast.error(String(msg));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDeleteTodo = async () => {
    if (!selectedTodo) return;

    setLoading(true);
    try {
      await adminDeleteTodo(selectedTodo.id);
      setTodos(todos.filter((t) => t.id !== selectedTodo.id));
      setDeleteDialogOpen(false);
      setSelectedTodo(null);
      toast.success("Todo deleted successfully");
    } catch (err: any) {
      const msg = err?.data?.detail || err?.message || "Failed to delete todo";
      toast.error(String(msg));
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (todo: Todo) => {
    setSelectedTodo(todo);
    setDeleteDialogOpen(true);
  };

  // Client-side filtering
  const filteredTodos = todos.filter((todo) => {
    // Status filter
    if (statusFilter === "done" && !todo.done) return false;
    if (statusFilter === "active" && todo.done) return false;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        todo.title.toLowerCase().includes(query) ||
        todo.description.toLowerCase().includes(query) ||
        todo.owner.email.toLowerCase().includes(query)
      );
    }

    return true;
  });

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
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <ListTodo className="w-8 h-8 text-primary" />
          <h1 className="text-text-900">All Todos</h1>
        </div>
        <p className="text-text-600">
          View and manage all user tasks across the platform
        </p>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-600" />
            <Input
              placeholder="Search by title, description, or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-border"
            />
          </div>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(value: any) => setStatusFilter(value)}
          >
            <SelectTrigger className="w-full sm:w-[180px] border-border">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Todos</SelectItem>
              <SelectItem value="active">Pending Only</SelectItem>
              <SelectItem value="done">Completed Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-text-600">
          <span>
            Showing {filteredTodos.length} of {todos.length} todos
          </span>
          
        </div>
      </Card>

      {/* Todos Table - Desktop */}
      <Card className="hidden md:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && filteredTodos.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredTodos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-text-600">
                  No todos found matching your filters
                </TableCell>
              </TableRow>
            ) : (
              filteredTodos.map((todo) => (
                <TableRow key={todo.id}>
                  <TableCell>{todo.id}</TableCell>
                  <TableCell className="font-medium max-w-xs truncate">
                    {todo.title}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-text-600">
                    {todo.description}
                  </TableCell>
                  <TableCell className="text-sm text-text-600 max-w-xs truncate">
                    {todo.owner.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={todo.done ? "default" : "secondary"}
                      className={
                        todo.done
                          ? "bg-success-500/10 text-success-500 hover:bg-success-500/20"
                          : "bg-warning-500/10 text-warning-500 hover:bg-warning-500/20"
                      }
                    >
                      {todo.done ? "Done" : "Pending"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(todo.created_at)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(todo.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(todo)}
                      className="text-error-500 hover:text-error-500 hover:bg-error-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Todos List - Mobile */}
      <div className="md:hidden space-y-4">
        {filteredTodos.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-text-600">No todos found matching your filters</p>
          </Card>
        ) : (
          filteredTodos.map((todo) => (
            <Card key={todo.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-start gap-2 mb-1">
                    <h3 className="font-medium text-text-900 flex-1">
                      {todo.title}
                    </h3>
                    <Badge
                      variant={todo.done ? "default" : "secondary"}
                      className={
                        todo.done
                          ? "bg-success-500/10 text-success-500"
                          : "bg-warning-500/10 text-warning-500"
                      }
                    >
                      {todo.done ? "Done" : "Pending"}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-600 mb-2">{todo.description}</p>
                  <div className="text-xs text-text-600 space-y-1">
                    <p>ID: {todo.id}</p>
                    <p>Owner: {todo.owner.email}</p>
                    <p>Created: {formatDate(todo.created_at)}</p>
                    <p>Updated: {formatDate(todo.updated_at)}</p>
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openDeleteDialog(todo)}
                className="w-full text-error-500 border-error-500/20 hover:bg-error-500/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </Card>
          ))
        )}
      </div>

 

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Todo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedTodo?.title}"?
              <br />
              <strong className="text-error-500">
                This will permanently delete a user's todo.
              </strong>
              <br />
              This action cannot be undone.
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
    </div>
  );
}
