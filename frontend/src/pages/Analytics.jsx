import MainLayout from '../layouts/MainLayout';

export default function AnalyticsPage({
  tasks = [],
  isDarkMode,
  setIsDarkMode
}) {

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    task => task.completed
  ).length;

  const activeTasks =
    totalTasks - completedTasks;

  const completionRate =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedTasks / totalTasks) * 100
        );

  const urgentCount =
    tasks.filter(
      task => task.factor === 'Urgent'
    ).length;

  const normalCount =
    tasks.filter(
      task => task.factor === 'Normal'
    ).length;

  const laterCount =
    tasks.filter(
      task => task.factor === 'Later'
    ).length;

  const oneWeekAgo = new Date();

  oneWeekAgo.setDate(
    oneWeekAgo.getDate() - 7
  );

  const completedThisWeek =
    tasks.filter(task =>
      task.completed &&
      task.completion_date &&
      new Date(task.completion_date) >= oneWeekAgo
    ).length;

  return (
    <MainLayout
      isDarkMode={isDarkMode}
      setIsDarkMode={setIsDarkMode}
    >
      <div className="w-full max-w-6xl mx-auto px-4 py-8">

        <h1 className="text-3xl font-bold text-orange-500 mb-8">
          Analytics Dashboard
        </h1>

        {/* TOP STATS */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
            <h3 className="text-sm text-slate-500 dark:text-slate-400">
              Total Tasks
            </h3>

            <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">
              {totalTasks}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
            <h3 className="text-sm text-slate-500 dark:text-slate-400">
              Completed
            </h3>

            <p className="text-3xl font-bold text-green-500 mt-2">
              {completedTasks}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
            <h3 className="text-sm text-slate-500 dark:text-slate-400">
              Active
            </h3>

            <p className="text-3xl font-bold text-orange-500 mt-2">
              {activeTasks}
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
            <h3 className="text-sm text-slate-500 dark:text-slate-400">
              Completion Rate
            </h3>

            <p className="text-3xl font-bold text-blue-500 mt-2">
              {completionRate}%
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6">
            <h3 className="text-sm text-slate-500 dark:text-slate-400">
              Completed This Week
            </h3>

            <p className="text-3xl font-bold text-emerald-500 mt-2">
              {completedThisWeek}
            </p>
          </div>

        </div>

        {/* PRIORITY DISTRIBUTION */}

        <div className="mt-8 bg-white dark:bg-slate-800 rounded-xl shadow p-6">

          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">
            Priority Distribution
          </h2>

          <div className="space-y-4">

            <div className="flex justify-between items-center">
              <span className="font-medium text-red-500">
                🔴 Urgent
              </span>

              <span className="font-bold text-slate-800 dark:text-white">
                {urgentCount}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-medium text-orange-500">
                🟠 Normal
              </span>

              <span className="font-bold text-slate-800 dark:text-white">
                {normalCount}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="font-medium text-green-500">
                🟢 Later
              </span>

              <span className="font-bold text-slate-800 dark:text-white">
                {laterCount}
              </span>
            </div>

          </div>

        </div>

      </div>
    </MainLayout>
  );
}