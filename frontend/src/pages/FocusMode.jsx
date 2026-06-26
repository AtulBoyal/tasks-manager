import MainLayout from '../layouts/MainLayout';

export default function FocusMode({
  tasks = [],
  isDarkMode,
  setIsDarkMode,
  handleComplete
}) {

  const today = new Date()
    .toISOString()
    .split('T')[0];

  const focusTasks = tasks.filter(task => {
    if (task.completed) return false;
    if (!task.last_date) return false;
    return task.last_date <= today;
  });

  const priorityOrder = {
    Urgent: 0,
    Normal: 1,
    Later: 2
  };

  focusTasks.sort(
    (a, b) =>
      priorityOrder[a.factor] -
      priorityOrder[b.factor]
  );

  const totalFocus =
    focusTasks.length;

  const completedFocus =
    tasks.filter(task =>
      task.completed &&
      task.last_date &&
      task.last_date <= today
    ).length;

  const progress =
    totalFocus + completedFocus === 0
      ? 100
      : Math.round(
          completedFocus /
          (completedFocus + totalFocus) *
          100
        );

  return (
    <MainLayout
      isDarkMode={isDarkMode}
      setIsDarkMode={setIsDarkMode}
    >
      <div className="w-full max-w-4xl mx-auto px-4 py-8">

        <h1 className="text-4xl font-bold text-center text-orange-500 mb-3">
          Today's Mission
        </h1>

        <p className="text-center text-slate-500 mb-8">
          {focusTasks.length} task(s) remaining
        </p>

        <div className="mt-6">
          <div className="flex justify-between mb-2 text-orange-500">
            <span>
              Progress
            </span>
            <span>
              {progress}%
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-200 dark:bg-slate-700">
            <div
              style={{ width: `${progress}%` }}
              className="h-3 rounded-full bg-orange-500 transition-all duration-500"
            />
          </div>
        </div>

        <div className="space-y-4">
          {focusTasks.length === 0 ? (
            <div className="text-center mt-16">
              <div className="text-7xl">
                🎉
              </div>
              <h2 className="text-3xl font-bold mt-4 text-orange-500">
                You're all caught up!
              </h2>
              <p className="text-slate-500 mt-2">
                No pending tasks for today.
              </p>
            </div>
          ) : (
            focusTasks.map(task => (
              <div
                key={task.id}
                className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow flex justify-between items-center"
              >
                <div>
                  <div className="font-bold text-lg text-orange-400">
                    {task.name}
                  </div>

                  <div className="text-sm text-slate-500">
                    {task.factor}
                  </div>
                </div>

                <button
                  onClick={() => handleComplete(task)}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg"
                >
                  Complete
                </button>
              </div>
            ))
          )}

        </div>

      </div>
    </MainLayout>
  );
}