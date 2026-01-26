import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { ListTodo, Plus, Trash2, Flag } from 'lucide-react';
import { cn } from '@/lib/utils';

type Priority = 'high' | 'medium' | 'low';

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: Priority;
  createdAt: string;
}

const STORAGE_KEY = 'watchfully-tasks';

const priorityConfig: Record<Priority, { label: string; color: string; bg: string }> = {
  high: { 
    label: 'High', 
    color: 'text-red-500', 
    bg: 'bg-red-500/10 border-red-500/30' 
  },
  medium: { 
    label: 'Medium', 
    color: 'text-amber-500', 
    bg: 'bg-amber-500/10 border-amber-500/30' 
  },
  low: { 
    label: 'Low', 
    color: 'text-emerald-500', 
    bg: 'bg-emerald-500/10 border-emerald-500/30' 
  },
};

export function TaskBar() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<Priority>('medium');
  const [isAdding, setIsAdding] = useState(false);

  // Load tasks from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${user?.id || 'guest'}`);
    if (stored) {
      try {
        setTasks(JSON.parse(stored));
      } catch {
        setTasks([]);
      }
    }
  }, [user]);

  // Save tasks to localStorage
  useEffect(() => {
    localStorage.setItem(`${STORAGE_KEY}-${user?.id || 'guest'}`, JSON.stringify(tasks));
  }, [tasks, user]);

  const addTask = () => {
    if (!newTaskTitle.trim()) return;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      completed: false,
      priority: newTaskPriority,
      createdAt: new Date().toISOString(),
    };
    
    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
    setNewTaskPriority('medium');
    setIsAdding(false);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const updatePriority = (id: string, priority: Priority) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, priority } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  // Sort tasks by priority (high > medium > low)
  const sortByPriority = (taskList: Task[]) => {
    const order: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    return [...taskList].sort((a, b) => order[a.priority] - order[b.priority]);
  };

  const incompleteTasks = sortByPriority(tasks.filter(t => !t.completed));
  const completedTasks = tasks.filter(t => t.completed);

  return (
    <Card className="bg-card border-border/50 h-full">
      <CardContent className="p-4 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <ListTodo className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Today's Tasks</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
          </Button>
        </div>

        {isAdding && (
          <div className="space-y-2.5 mb-4">
            <div className="flex gap-1.5">
              <Input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add a task..."
                className="h-9 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addTask();
                  if (e.key === 'Escape') setIsAdding(false);
                }}
                autoFocus
              />
              <Button size="sm" className="h-9 px-4" onClick={addTask}>
                Add
              </Button>
            </div>
            <div className="flex gap-1.5">
              {(Object.keys(priorityConfig) as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setNewTaskPriority(p)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md border transition-colors",
                    newTaskPriority === p 
                      ? priorityConfig[p].bg 
                      : "bg-muted/40 border-transparent hover:bg-muted",
                    priorityConfig[p].color
                  )}
                >
                  {priorityConfig[p].label}
                </button>
              ))}
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className="space-y-1.5 pr-1.5">
            {incompleteTasks.length === 0 && completedTasks.length === 0 && !isAdding && (
              <p className="text-xs text-muted-foreground text-center py-8">
                No tasks yet. Click + to add one.
              </p>
            )}

            {incompleteTasks.map(task => (
              <div 
                key={task.id}
                className={cn(
                  "group flex items-start gap-2.5 p-3 rounded-lg border transition-colors",
                  priorityConfig[task.priority].bg
                )}
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task.id)}
                  className="mt-0.5 h-4 w-4"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-snug">{task.title}</p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Flag className={cn("h-3.5 w-3.5", priorityConfig[task.priority].color)} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(Object.keys(priorityConfig) as Priority[]).map((p) => (
                        <DropdownMenuItem 
                          key={p} 
                          onClick={() => updatePriority(task.id, p)}
                          className={priorityConfig[p].color}
                        >
                          <Flag className="h-3.5 w-3.5 mr-1.5" />
                          {priorityConfig[p].label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => deleteTask(task.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}

            {completedTasks.length > 0 && (
              <div className="pt-3 border-t border-border/50 mt-3">
                <p className="text-[10px] text-muted-foreground mb-2 px-1 font-medium">Completed</p>
                {completedTasks.slice(0, 3).map(task => (
                  <div 
                    key={task.id}
                    className="group flex items-start gap-2.5 p-2.5 rounded-md opacity-50 hover:opacity-70 transition-opacity"
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="mt-0.5 h-4 w-4"
                    />
                    <p className="text-xs line-through text-muted-foreground flex-1 truncate">
                      {task.title}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
