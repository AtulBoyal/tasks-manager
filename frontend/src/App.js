import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
  const [taskName, setTaskName] = useState('');
  const [factor, setFactor] = useState('Easy');
  const [lastDate, setLastDate] = useState('');
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:8000/api/tasks')
      .then(response => {
        setTasks(response.data);
      })
      .catch(error => {
        console.error('Error fetching tasks:', error);
      });
  }, []);

  const fetchTasks = () => {
    axios.get('http://localhost:8000/api/tasks/')
      .then(response => {
        setTasks(response.data);
      })
      .catch(error => {
        console.error('Error fetching tasks:', error);
      });
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


  return (
    <div style={{ maxWidth: 400, margin: "auto", padding: 20 }}>
      <h2>Add a new task</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Task Name: </label><br/>
          <input
          type = "text"
          value={taskName}
          onChange={e => setTaskName(e.target.value)}
          required
          />
        </div>
        <br/>
        <div>
          <label>Difficulty Factor:</label><br/>
          <select
            value = {factor}
            onChange={e => setFactor(e.target.value)}
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
        <br/>
        <div>
          <label>Last Date: </label>
          <input
          type="date"
          value={lastDate}
          onChange={e => setLastDate(e.target.value)}
          required
          >
          </input>
          <br/>
          <button type="submit">Add Task</button>
        </div>
      </form>

      <h2>Saved Tasks</h2>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            <strong>{task.name}</strong> | Factor: {task.factor} | Last Date: {task.last_date}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
