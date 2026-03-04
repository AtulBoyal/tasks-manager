import React, { useMemo } from 'react';

function ConsistencyHeatmap({ tasks }) {
  // 1. Generate the last 84 days (12 weeks)
  const daysToTrack = 84;
  
  const heatmapData = useMemo(() => {
    // Create a map of { 'YYYY-MM-DD': count }
    const completionCounts = {};
    
    tasks.forEach(task => {
      if (task.completed && task.completion_date) {
        // Extract just the date part (YYYY-MM-DD) from the ISO string
        const dateStr = task.completion_date.split('T')[0];
        completionCounts[dateStr] = (completionCounts[dateStr] || 0) + 1;
      }
    });

    const daysArray = [];
    const today = new Date();
    
    // Build the array going backward from today
    for (let i = daysToTrack - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateString = d.toISOString().split('T')[0];
      
      daysArray.push({
        date: dateString,
        count: completionCounts[dateString] || 0
      });
    }
    
    return daysArray;
  }, [tasks]);

  // 2. Determine color intensity based on completion count
  const getColorClass = (count) => {
    if (count === 0) return 'bg-[#fff5e6] dark:bg-slate-700/50 border border-orange-100 dark:border-slate-600/50';
    if (count === 1) return 'bg-[#ffc97a] dark:bg-[#994800] border border-[#ffb74d] dark:border-[#994800]';
    if (count === 2) return 'bg-[#f57c00] dark:bg-[#e65c00] border border-[#ef6c00] dark:border-[#e65c00] shadow-[0_0_4px_rgba(245,124,0,0.4)]';
    return 'bg-[#bf360c] dark:bg-[#ff7b00] border border-[#a62c08] dark:border-[#ff7b00] shadow-[0_0_6px_rgba(191,54,12,0.6)]'; // 3 or more
  };

  // 3. Calculate current streak
  const currentStreak = useMemo(() => {
    let streak = 0;
    // Walk backward from today
    for (let i = heatmapData.length - 1; i >= 0; i--) {
      if (heatmapData[i].count > 0) {
        streak++;
      } else if (i !== heatmapData.length - 1) {
        // If it's 0, and it's NOT today (allowing today to still be 0 without breaking yesterday's streak), break.
        break;
      }
    }
    return streak;
  }, [heatmapData]);

  return (
    <div className="w-[92vw] max-w-[900px] mx-auto mb-[24px] bg-white/60 dark:bg-slate-800/80 backdrop-blur-sm rounded-[18px] p-5 sm:p-6 shadow-[0_4px_20px_#ffe5a930] dark:shadow-none border border-orange-100 dark:border-slate-700 transition-colors duration-300">
      
      <div className="flex justify-between items-end mb-4">
        <div>
          <h2 className="text-xl font-bold text-[#cc6000] dark:text-orange-400">Activity Heatmap</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Last 12 weeks of productivity</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-extrabold text-[#f57c00] dark:text-orange-500">
            {currentStreak} <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Day Streak {currentStreak > 2 ? '🔥' : ''}</span>
          </div>
        </div>
      </div>

      {/* The Grid */}
      <div className="flex flex-wrap gap-[4px] sm:gap-[6px] justify-end">
        {heatmapData.map((day, idx) => (
          <div
            key={day.date}
            title={`${day.count} tasks completed on ${day.date}`}
            className={`w-[12px] h-[12px] sm:w-[15px] sm:h-[15px] rounded-[3px] transition-all hover:scale-125 cursor-help ${getColorClass(day.count)}`}
          />
        ))}
      </div>
      
      <div className="flex justify-end items-center gap-2 mt-3 text-xs text-slate-400 font-medium">
        <span>Less</span>
        <div className={`w-3 h-3 rounded-[2px] ${getColorClass(0)}`} />
        <div className={`w-3 h-3 rounded-[2px] ${getColorClass(1)}`} />
        <div className={`w-3 h-3 rounded-[2px] ${getColorClass(2)}`} />
        <div className={`w-3 h-3 rounded-[2px] ${getColorClass(3)}`} />
        <span>More</span>
      </div>
    </div>
  );
}

export default ConsistencyHeatmap;