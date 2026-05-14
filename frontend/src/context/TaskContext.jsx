import { createContext, useContext } from 'react';

const TaskContext = createContext();

export function TaskProvider({ value, children }) {
  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  return useContext(TaskContext);
}