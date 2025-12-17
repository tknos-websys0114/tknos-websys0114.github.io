import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, STORES } from '../../utils/db';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      const savedTodos = await db.get<Todo[]>(STORES.SCHEDULE, 'todos');
      if (savedTodos) {
        setTodos(savedTodos.sort((a, b) => b.createdAt - a.createdAt));
      }
    } catch (error) {
      console.error('Failed to load todos:', error);
    }
  };

  const saveTodos = async (newTodos: Todo[]) => {
    try {
      await db.set(STORES.SCHEDULE, 'todos', newTodos);
      setTodos(newTodos);
    } catch (error) {
      console.error('Failed to save todos:', error);
    }
  };

  const handleAddTodo = async () => {
    if (!newTodo.trim()) return;

    const todo: Todo = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    const updatedTodos = [todo, ...todos];
    await saveTodos(updatedTodos);
    setNewTodo('');
    setIsAdding(false);
  };

  const handleToggleComplete = async (id: string) => {
    const updatedTodos = todos.map(t => 
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    await saveTodos(updatedTodos);
  };

  const handleDelete = async (id: string) => {
    const updatedTodos = todos.filter(t => t.id !== id);
    await saveTodos(updatedTodos);
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto custom-scrollbar">
      {/* 标题区 - 手写风格 */}
      <div className="mb-6 ml-2 relative inline-block">
        <h2 className="text-2xl font-bold text-[#5A5A5A] relative z-10">To-Do List</h2>
        <div className="absolute bottom-1 left-0 w-full h-3 bg-[#FFE4E1] -rotate-2 z-0 opacity-70"></div>
      </div>

      {/* 待办列表 */}
      <div className="flex-1 space-y-3 pb-20">
        <AnimatePresence initial={false}>
          {todos.map((todo) => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`group relative p-4 rounded-xl border-2 transition-all duration-200 active:scale-[0.99] ${
                todo.completed 
                  ? 'bg-[#F0F0F0] border-transparent opacity-60' 
                  : 'bg-white border-[#F0F0F0] shadow-sm active:border-[#D4E0D6]'
              }`}
            >
              {/* 装饰图钉 */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#D4E0D6] border border-white shadow-sm z-10"></div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleComplete(todo.id)}
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 active:scale-90 ${
                    todo.completed
                      ? 'bg-[#8CAE8C] border-[#8CAE8C]'
                      : 'border-[#D1D1D1] active:border-[#8CAE8C]'
                  }`}
                >
                  {todo.completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </button>
                
                <span className={`flex-1 text-[15px] font-medium leading-relaxed ${
                  todo.completed ? 'text-[#999] line-through decoration-2 decoration-[#999]/30' : 'text-[#5A5A5A]'
                }`}>
                  {todo.text}
                </span>

                <button
                  onClick={() => handleDelete(todo.id)}
                  className="p-2 text-[#999] active:text-[#FF6B6B] active:scale-95 transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {todos.length === 0 && !isAdding && (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <div className="w-20 h-20 border-4 border-dashed border-[#5A5A5A] rounded-full flex items-center justify-center mb-4">
               <Check className="w-10 h-10 text-[#5A5A5A]" />
            </div>
            <p className="font-bold text-[#5A5A5A]">暂无待办事项</p>
            <p className="text-sm">好好休息一下吧～</p>
          </div>
        )}
      </div>

      {/* 添加按钮或输入框 */}
      <div className="absolute bottom-6 right-6 left-6 z-20 pointer-events-none">
        <div className="pointer-events-auto">
          <AnimatePresence>
            {isAdding ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="bg-white p-2 rounded-2xl shadow-xl border-2 border-[#5A5A5A]/10 flex gap-2"
              >
                <input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  placeholder="写点什么..."
                  autoFocus
                  className="flex-1 bg-transparent px-4 py-2 outline-none text-[#5A5A5A] placeholder:text-[#999]"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTodo()}
                />
                <button 
                  onClick={handleAddTodo}
                  className="w-10 h-10 bg-[#5A5A5A] rounded-xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform duration-200"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsAdding(false)}
                  className="w-10 h-10 bg-[#F5F5F5] rounded-xl flex items-center justify-center text-[#5A5A5A] active:scale-90 transition-transform duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            ) : (
              <div className="flex justify-end">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  onClick={() => setIsAdding(true)}
                  className="w-14 h-14 bg-[#5A5A5A] rounded-full shadow-lg shadow-[#5A5A5A]/30 flex items-center justify-center text-white"
                >
                  <Plus className="w-7 h-7" />
                </motion.button>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
