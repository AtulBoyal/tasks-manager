function PageContainer({ children }) {
  return (
    <div className="min-h-screen flex flex-col items-center w-screen overflow-x-hidden">
      {children}
    </div>
  );
}

export default PageContainer;