import { useEffect } from "react";
import { X, Code2 } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";

export default function AboutDeveloperModal({
  isOpen,
  onClose,
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);


  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="developer-title"
        onClick={(e) => e.stopPropagation()}
        className="
          w-full
          max-w-xl
          rounded-3xl
          bg-[#FFFDF9]
          dark:bg-[#111827]
          border
          border-orange-100
          dark:border-slate-700
          shadow-2xl
          p-10
          animate-in
          fade-in
          zoom-in-95
          duration-200
        "
      >
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
                <X size={18} className="text-orange-600"/>
            </button>
        </div>

        <hr className="my-8 border-orange-200 dark:border-orange-500/30" />

        <div className="flex flex-col items-center text-center">

          <div className="flex flex-col items-center text-center">

            <div
                className="
                h-24
                w-24
                rounded-full
                bg-gradient-to-br
                from-orange-400
                to-orange-600
                flex
                items-center
                justify-center
                text-white
                shadow-lg
                "
            >
                <Code2 size={42}/>
            </div>

            <h2 id="developer-title" className="mt-6 text-4xl font-extrabold text-slate-800 dark:text-white">
                Atul Boyal
            </h2>

            <p className="mt-1 text-orange-600 font-medium">
                Computer Science & Engineering
            </p>

            <p className="text-slate-600 dark:text-slate-300">
                IIT Hyderabad
            </p>

            <p className="mt-4 max-w-md text-sm leading-7 font-medium text-slate-700 dark:text-slate-300">
              Passionate about building scalable software, operating systems, competitive programming, and modern full-stack applications focused on performance and user experience.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-2">

                <span 
                    className="
                        rounded-full
                        bg-orange-50
                        text-orange-700
                        border
                        border-orange-100
                        px-3
                        py-1
                        text-sm

                        dark:bg-orange-500/15
                        dark:text-orange-300
                        dark:border-orange-500/20
                    "
                >
                    React
                </span>

                <span
                    className="
                        rounded-full
                        bg-orange-50
                        text-orange-700
                        border
                        border-orange-100
                        px-3
                        py-1
                        text-sm

                        dark:bg-orange-500/15
                        dark:text-orange-300
                        dark:border-orange-500/20
                    "
                >
                    Node.js
                </span>

                <span 
                    className="
                        rounded-full
                        bg-orange-50
                        text-orange-700
                        border
                        border-orange-100
                        px-3
                        py-1
                        text-sm

                        dark:bg-orange-500/15
                        dark:text-orange-300
                        dark:border-orange-500/20
                    "
                >
                    PostgreSQL
                </span>

                <span
                    className="
                        rounded-full
                        bg-orange-50
                        text-orange-700
                        border
                        border-orange-100
                        px-3
                        py-1
                        text-sm

                        dark:bg-orange-500/15
                        dark:text-orange-300
                        dark:border-orange-500/20
                    "
                >
                    Linux
                </span>

                <span
                    className="
                        rounded-full
                        bg-orange-50
                        text-orange-700
                        border
                        border-orange-100
                        px-3
                        py-1
                        text-sm

                        dark:bg-orange-500/15
                        dark:text-orange-300
                        dark:border-orange-500/20
                    "
                >
                    Competitive Programming
                </span>

            </div>

            </div>

          <div className="mt-8 w-full space-y-3">

            <a
              href="https://github.com/AtulBoyal"
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex
                items-center
                justify-center
                gap-3
                rounded-xl
                border
                border-orange-100
                dark:border-slate-700
                py-3
                transition-all
                duration-200
                hover:-translate-y-1
                hover:shadow-lg
                border-orange-200
                bg-white/70

                dark:bg-slate-800/30
                dark:border-orange-500/20
                hover:border-orange-500
                hover:bg-orange-50
                hover:bg-slate-900
                hover:text-white
                dark:hover:bg-slate-800
              "
            >
              <FaGithub className="text-2xl text-slate-800 dark:text-white" />
                <span className="font-medium text-orange-700 dark:text-orange-300"> View GitHub → </span>
            </a>

            <a
              href="https://www.linkedin.com/in/atul-boyal/"
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex
                items-center
                justify-center
                gap-3
                rounded-xl
                border
                border-orange-100
                dark:border-slate-700
                py-3
                transition-all
                duration-200
                border-orange-200
                bg-white/70

                dark:bg-slate-800/30
                dark:border-orange-500/20
                hover:-translate-y-1
                hover:shadow-lg
                hover:border-orange-500
                hover:bg-orange-50
                hover:bg-[#0A66C2]
                hover:text-white
                dark:hover:bg-slate-800
              "
            >
              <FaLinkedin className="text-2xl text-[#0A66C2]" />
                <span className="font-medium text-orange-700 dark:text-orange-300">Connect on LinkedIn →</span>
            </a>

            <a
              href="mailto:atulboyal55@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
              className="
                flex
                items-center
                justify-center
                gap-3
                rounded-xl
                border
                border-orange-100
                dark:border-slate-700
                py-3
                transition-all
                border-orange-200
                bg-white/70

                dark:bg-slate-800/30
                dark:border-orange-500/20
                duration-200
                hover:-translate-y-1
                hover:shadow-lg
                hover:border-orange-500
                hover:bg-orange-50
                dark:hover:bg-slate-800
              "
            >
              <span className="font-medium text-orange-700 dark:text-orange-300">Email Me →</span>
            </a>

          </div>

          <p className="mt-8 text-s italic text-slate-500 dark:text-slate-400">
            TaskVault is one of my personal engineering projects. If you enjoyed using it, I'd love to connect!
          </p>

        </div>
      </div>
    </div>
  );
}