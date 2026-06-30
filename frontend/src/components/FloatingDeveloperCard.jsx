import { useState } from "react";
import AboutDeveloperModal from "./AboutDeveloperModal";

export default function FloatingDeveloperCard() {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowAbout(true)}
        className="
          fixed
          bottom-6
          right-6
          z-40

          hidden
          sm:flex

          items-center
          gap-2

          rounded-2xl

          border
          border-orange-200
          dark:border-orange-500/30

          bg-white/85
          dark:bg-slate-900/85

          backdrop-blur-md

          px-5
          py-3

          shadow-lg

          hover:-translate-y-1
          hover:shadow-2xl
          hover:border-orange-400

          transition-all
          duration-300
        "
      >
        <span className="text-xl">👨‍💻</span>

        <div className="text-left">
          <p className="font-semibold text-slate-800 dark:text-white">
            Meet the Developer
          </p>

          <p className="text-xs text-orange-500">
            Atul Boyal
          </p>
        </div>
      </button>

      {/* Mobile */}

      <button
        onClick={() => setShowAbout(true)}
        className="
          fixed
          bottom-5
          left-1/2
          -translate-x-1/2

          sm:hidden

          z-40

          rounded-full

          bg-orange-500

          px-5
          py-3

          text-white
          font-semibold

          shadow-xl

          hover:bg-orange-600

          transition
        "
      >
        👨‍💻 Meet Developer
      </button>

      <AboutDeveloperModal
        isOpen={showAbout}
        onClose={() => setShowAbout(false)}
      />
    </>
  );
}