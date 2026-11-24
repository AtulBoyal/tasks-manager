import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient'; 
import { generateAutoTags } from './tagEngine'; // ✨ Import your engine

function App() {
  const [taskName, setTaskName] = useState('');
  const [factor, setFactor] = useState('Normal');
  const [lastDate, setLastDate] = useState(null);
  const [link, setLink] = useState('');
  const [tags, setTags] = useState(''); // Manual tags input
  
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    // Local date (toISOString() would give the UTC date)
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    setLastDate(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = taskName.trim();
    if (!cleanName) return;

    setIsSaving(true);
    setErrorMsg('');

    // Same shape as the web app: [{ title, url }]
    const cleanLink = link.trim();
    const linkArray = cleanLink ? [{ title: cleanLink, url: cleanLink }] : [];
    
    // 1. Process manual tags from the input box
    const manualTags = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);

    // 2. ✨ THE SMART MERGE: Feed the task name and manual tags into your engine
    const finalTags = generateAutoTags(cleanName, manualTags);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user?.id) {
        setErrorMsg('Not signed in. The extension has no Supabase session.');
        return;
      }

      const newTask = {
        id: Date.now(),
        user_id: session.user.id,
        name: cleanName,
        factor: factor,
        last_date: lastDate || null,
        start_date: null,
        completed: false,
        recurrence: 'none',
        links: linkArray,
        tags: finalTags, // Send the combined smart tags to the database
        subtasks: []
      };

      // Supabase returns errors instead of throwing them
      const { error } = await supabase
        .from('tasks')
        .insert([newTask]);

      if (error) throw error;

      window.close(); // Only close once the task is actually saved
    } catch (error) {
      console.error("Failed to save:", error);
      setErrorMsg(error?.message || 'Failed to save task.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-[320px] p-4 bg-slate-900 text-white font-sans border border-slate-700 shadow-2xl rounded-lg">
      <h2 className="text-sm font-bold text-orange-500 mb-4 flex items-center gap-2">
        <span>⚡</span> Quick Add Task
      </h2>
      
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        
        <div>
          <input 
            ref={inputRef}
            type="text" 
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder="What do you need to do?"
            className="w-full px-3 py-2 rounded-md bg-slate-800 border border-slate-700 focus:outline-none focus:border-orange-500 text-sm placeholder-slate-400"
            disabled={isSaving}
            required
          />
        </div>

        <div className="flex gap-2">
          <select 
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
            className="w-1/2 px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 focus:outline-none focus:border-orange-500 text-xs text-slate-200 cursor-pointer"
            disabled={isSaving}
          >
            <option value="Urgent">🔴 Urgent</option>
            <option value="Normal">🟡 Normal</option>
            <option value="Later">🔵 Later</option>
          </select>

          <input 
            type="date"
            value={lastDate || ''}
            onChange={(e) => setLastDate(e.target.value)}
            className="w-1/2 px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 focus:outline-none focus:border-orange-500 text-xs text-slate-200"
            disabled={isSaving}
          />
        </div>

        <div>
          <input 
            type="url" 
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://... (Optional link)"
            className="w-full px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 focus:outline-none focus:border-orange-500 text-xs placeholder-slate-500"
            disabled={isSaving}
          />
        </div>

        <div>
          <input 
            type="text" 
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Extra tags? (Auto-tags apply automatically)"
            className="w-full px-3 py-1.5 rounded-md bg-slate-800 border border-slate-700 focus:outline-none focus:border-orange-500 text-xs placeholder-slate-500"
            disabled={isSaving}
          />
        </div>

        <button 
          type="submit" 
          disabled={isSaving}
          className="w-full bg-orange-600 hover:bg-orange-500 text-white py-2 rounded-md font-bold text-sm transition-colors mt-1"
        >
          {isSaving ? 'Saving...' : 'Add to Tasks'}
        </button>

        {errorMsg && (
          <p className="text-xs text-red-400" role="alert">{errorMsg}</p>
        )}
      </form>
    </div>
  );
}

export default App;