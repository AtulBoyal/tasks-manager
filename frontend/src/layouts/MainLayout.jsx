import Header from '../components/Header';
import Navbar from '../components/Navbar';

export default function MainLayout({
  children,
  isDarkMode,
  setIsDarkMode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center w-screen overflow-x-hidden">
      
      <Header
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />

      <Navbar />

      <main className="w-full flex flex-col items-center">
        {children}
      </main>

    </div>
  );
}