function SectionCard({ children, className = '' }) {
  return (
    <div
      className={`
        w-[96vw]
        max-w-[900px]
        mx-auto
        rounded-[18px]
        shadow-[0_2px_14px_#ffe5a940]
        dark:shadow-none
        bg-[#fffbe7]
        dark:bg-slate-800
        dark:border
        dark:border-slate-700
        pt-[28px]
        px-[12px]
        sm:px-[18px]
        pb-[22px]
        transition-colors
        duration-300
        ${className}
      `}
    >
      {children}
    </div>
  );
}

export default SectionCard;