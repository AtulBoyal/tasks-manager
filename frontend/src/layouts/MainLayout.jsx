import Header from '../components/Header';
import Navbar from '../components/Navbar';
import FloatingDeveloperCard from "../components/FloatingDeveloperCard";

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

      <main className="flex-1 w-full flex flex-col items-center">
        {children}
      </main>

      <FloatingDeveloperCard />

    </div>
  );
}