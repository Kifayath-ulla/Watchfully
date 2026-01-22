import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ListTodo, Plus, Trash2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
}

const STORAGE_KEY = 'watchfully-tasks';

export function TaskBar() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
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
      priority: 'medium',
      createdAt: new Date().toISOString(),
    };
    
    setTasks(prev => [newTask, ...prev]);
    setNewTaskTitle('');
    setIsAdding(false);
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const deleteTask = (id: string) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  const incompleteTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card className="bg-card/80 h-full">
      <CardContent className="p-3 h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Today's Tasks</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-full bg-primary/10 hover:bg-primary/20"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
          </Button>
        </div>

        {isAdding && (
          <div className="flex gap-2 mb-2">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Add a task..."
              className="h-7 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') addTask();
                if (e.key === 'Escape') setIsAdding(false);
              }}
              autoFocus
            />
            <Button size="sm" className="h-7 px-2 text-xs" onClick={addTask}>
              Add
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="space-y-1">
            {incompleteTasks.length === 0 && completedTasks.length === 0 && !isAdding && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No tasks yet. Click + to add one.
              </p>
            )}

            {incompleteTasks.map(task => (
              <div 
                key={task.id}
                className="group flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => toggleTask(task.id)}
                  className="mt-0.5 h-4 w-4"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-tight truncate">{task.title}</p>
                  {task.description && (
                    <p className="text-[10px] text-muted-foreground truncate">{task.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => deleteTask(task.id)}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            ))}

            {completedTasks.length > 0 && (
              <div className="pt-2 border-t border-border/50 mt-2">
                <p className="text-[10px] text-muted-foreground mb-1 px-2">Completed</p>
                {completedTasks.slice(0, 3).map(task => (
                  <div 
                    key={task.id}
                    className="group flex items-start gap-2 p-2 rounded-md opacity-60"
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
                      className="h-5 w-5 opacity-0 group-hover:opacity-100"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-3 w-3" />
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
