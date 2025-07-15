import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [taskName, setTaskName] = useState('');
  const [factor, setFactor] = useState('Easy');
  const [lastDate, setLastDate] = useState('');
  const [tasks, setTasks] = useState([]);

  const fetchTasks = () => {
    axios.get('http://localhost:8000/api/tasks/')
      .then(response => setTasks(response.data))
      .catch(error => console.error('Error fetching tasks:', error));
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/api/tasks/', {
        name: taskName,
        factor: factor,
        last_date: lastDate,
      });
      setTaskName('');
      setFactor('Easy');
      setLastDate('');
      fetchTasks(); // Refresh tasks after adding
    } catch (error) {
      console.error('Error saving task:', error);
    }
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

  const handleDelete = async(id) => {
    try {
      await axios.delete(`http://localhost:8000/api/tasks/${id}/`);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task: ', error);
    }
  };


  return (
    <div className='screen-wrap'>
      <div className='form-card'>
        <h2 className='add-heading'>Add a New Task</h2>
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
              onChange={e => setLastDate(e.target.value)}
              required
            />
          </div>
          <div className='center-btn-row'>
            <button type="submit">
              Add Task
            </button>
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
            {tasks.length === 0 &&(
              <tr>
                <td colSpan="5" style={{textAlign: 'center'}}>No tasks added.</td>
              </tr>     
            )}
            {tasks.map((task, idx) => (
              <tr key={task.id}>
                <td>{idx+1}.</td>
                <td>{task.name}</td>
                <td>
                  <span className={`factor-box ${getFactorClass(task.factor)}`}>
                    {task.factor}
                  </span>
                </td>
                <td>({formatDate(task.last_date)})</td>
                <td>
                  <div className='tooltip-container'>
                    <button
                      className='delete-btn'
                      onClick={() => handleDelete(task.id)}
                      aria-label="Delete Task"
                    >
                      <span role='img' aria-label='bin'>&#128465;</span>
                    </button>
                    <div className='tooltip-text'>Delete</div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
