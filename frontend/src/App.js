import React, { useEffect, useState } from 'react';
import './App.css';
import { githubStorage } from './githubStorage';

function App() {
  const [taskName, setTaskName] = useState('');
  const [factor, setFactor] = useState('Easy');
  const [lastDate, setLastDate] = useState('');
  const [tasks, setTasks] = useState([]);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordOk, setPasswordOk] = useState(false);

  const correctPassword = process.env.REACT_APP_TASKS_PASSWORD;

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (enteredPassword === correctPassword) {
      setPasswordOk(true);
    } else {
      alert("Wrong password! Try again.");
    }
  };

  const fetchTasks = async () => {
    const { tasks } = await githubStorage.getTasks();
    setTasks(tasks || []);
  };

  useEffect(() => {
    if (passwordOk) {
      fetchTasks();
    }
  }, [passwordOk]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { tasks: currentTasks, sha } = await githubStorage.getTasks();
    
    let updatedTasks;
    if (editingTaskId) {
      updatedTasks = currentTasks.map(t => 
        t.id === editingTaskId ? { ...t, name: taskName, factor, last_date: lastDate } : t
      );
    } else {
      const newTask = {
        id: Date.now(), // Generate a simple ID
        name: taskName,
        factor: factor,
        last_date: lastDate,
        completed: false
      };
      updatedTasks = [...currentTasks, newTask];
    }

    await githubStorage.saveTasks(updatedTasks, sha);
    // Reset states
    setTaskName(''); setFactor('Easy'); setLastDate(''); setEditingTaskId(null);
    fetchTasks();
  };

  // Helper for formatted date (ndd/mm/yyyy)
  const formatDate = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Helper for colored badges
  const getFactorClass = (factor) => {
    if (factor === 'Easy') return 'factor-easy';
    if (factor === 'Medium') return 'factor-medium';
    if (factor === 'Hard') return 'factor-hard';
    return '';
  };

  const handleDelete = async (id) => {
    const { tasks: currentTasks, sha } = await githubStorage.getTasks();
    const updatedTasks = currentTasks.filter(t => t.id !== id);
    await githubStorage.saveTasks(updatedTasks, sha);
    fetchTasks();
  };

  const handleEdit = (task) => {
    setTaskName(task.name);
    setFactor(task.factor);
    setLastDate(task.last_date);
    setEditingTaskId(task.id);
  };

  // Helper function for difficulty order
  const difficultyOrder = {
    'Easy' : 1,
    'Medium' : 2,
    'Hard' : 3
  };

  // Sort tasks before rendering
  const sortedTasks = [...tasks]
    .filter(task => !task.completed)
    .sort((a,b) =>{
      const dateA = new Date(a.last_date);
      const dateB = new Date(b.last_date);
      if(dateA < dateB) return -1;
      if(dateA > dateB) return 1;
      // Same date: sort by factor
      return difficultyOrder[a.factor] - difficultyOrder[b.factor];
    });

  const todayDate = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

  const handleComplete = async (task) => {
    const { tasks: currentTasks, sha } = await githubStorage.getTasks();
    
    const updatedTasks = currentTasks.map(t => 
      t.id === task.id 
        ? { ...t, completed: true, completion_date: new Date().toISOString() } 
        : t
    );

    await githubStorage.saveTasks(updatedTasks, sha);
    fetchTasks();
  };

  const handleUndoComplete = async (task) => {
    const { tasks: currentTasks, sha } = await githubStorage.getTasks();
    
    const updatedTasks = currentTasks.map(t => 
      t.id === task.id 
        ? { ...t, completed: false, completion_date: null } 
        : t
    );

    await githubStorage.saveTasks(updatedTasks, sha);
    fetchTasks();
  };



  return (
    <div>
      {!passwordOk ? (
        <div className="password-container">
          <div className="password-box">
            <h2>Enter Password to View Tasks</h2>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                className="password-input"
                value={enteredPassword}
                onChange={e => setEnteredPassword(e.target.value)}
                placeholder="Password"
                autoFocus
              />
              <button type="submit" className="unlock-button">Unlock</button>
            </form>
          </div>
        </div>
      ) : (
        <div>
          <div className='screen-wrap'>
          <div className='form-card'>
            <h2 className='add-heading'>
              {editingTaskId ? '✏️ Update Task' : 'Add a New Task'}
            </h2>
            {editingTaskId && (
              <p className="edit-mode-notice">
                Click "Update Task" to save or "Cancel" to discard.
              </p>
            )}
            <form onSubmit={handleSubmit} className='task-form-horiz'>
              <div className='form-group'>
                <label>Task: </label>
                <input
                  type = "text"
                  value={taskName}
                  onChange={e => setTaskName(e.target.value)}
                  required
                />
              </div>
              <div className='form-group'>
                <label>Factor:</label><br/>
                <select
                  value = {factor}
                  onChange={e => setFactor(e.target.value)}
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div className='form-group'>
                <label>Last Date: </label>
                <input
                  type="date"
                  value={lastDate}
                  min = {todayDate}
                  onChange={e => setLastDate(e.target.value)}
                  required
                />
              </div>
              <div className='center-btn-row'>
                <button type="submit">
                  {editingTaskId ? 'Update Task' : 'Add Task'}
                </button>
                {editingTaskId && (
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => {
                      setTaskName('');
                      setFactor('Easy');
                      setLastDate('');
                      setEditingTaskId(null);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className='tasks-card-wide'>
            <h2 className='tasks-heading'>My Tasks</h2>
            <table className="task-table">
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>Task</th>
                  <th>Factor</th>
                  <th>Last Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedTasks.length === 0 &&(
                  <tr>
                    <td colSpan="5" style={{textAlign: 'center'}}>No tasks added.</td>
                  </tr>     
                )}
                {sortedTasks.map((task, idx) => (
                  <tr key={task.id}>
                    <td>{idx+1}.</td>
                    <td>
                      <span 
                        className={`task-name${task.last_date === todayDate ? ' deadline-today' : ''}`}>
                        {task.name}
                      </span>
                    </td>
                    <td>
                      <span className={`factor-box ${getFactorClass(task.factor)}`}>
                        {task.factor}
                      </span>
                    </td>
                    <td>({formatDate(task.last_date)})</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="edit-btn"
                          onClick={() => handleEdit(task)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(task.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                        <button
                          className="complete-btn"
                          onClick={() => handleComplete(task)}
                          title="Mark as Complete"
                        >
                          ✔️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tasks.some(task => task.completed) && (
            <div className='tasks-card-wide'>
              <h2 className='tasks-heading'>Completed Tasks</h2>
              <table className="task-table">
                <thead>
                  <tr>
                    <th>S.No.</th>
                    <th>Task</th>
                    <th>Factor</th>
                    <th>Last Date</th>
                    <th>Completion Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {[...tasks]
                    .filter(task => task.completed)
                    .sort((a, b) => {
                      const dateA = new Date(a.last_date);
                      const dateB = new Date(b.last_date);
                      if (dateA < dateB) return 1;
                      if (dateA > dateB) return -1;
                      return difficultyOrder[a.factor] - difficultyOrder[b.factor];
                    })
                    .map((task, idx) => (
                      <tr key={task.id}>
                        <td>{idx + 1}.</td>
                        <td className="completed-task">✅ {task.name}</td>
                        <td>
                          <span className={`factor-box ${getFactorClass(task.factor)}`}>
                            {task.factor}
                          </span>
                        </td>
                        <td>{formatDate(task.last_date)}</td>
                        <td>
                          ({task.completion_date
                            ? formatDate(task.completion_date)
                            : ''})
                        </td>
                        <td>
                          <button
                            className="undo-btn"
                            onClick={() => handleUndoComplete(task)}
                            title="Mark as Incomplete"
                          >
                            ↩️
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

export default App;
