import RightSidebar from "./RightSidebar";

export default function PageShell({
  title,
  description,
  actions,
  children,
  noSidebar,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  noSidebar?: boolean;
}) {
  return (
    <>
      <main className={`min-h-screen md:ml-60 ${noSidebar ? "" : "lg:mr-72"}`}>
        <div className="max-w-2xl mx-auto py-6 px-4">
          <div className="flex items-start justify-between mb-6 gap-4">
            <div>
              <h1 className="text-xl font-semibold" style={{ color: "var(--fg)" }}>{title}</h1>
              {description && (
                <p className="text-sm mt-0.5" style={{ color: "var(--fg-muted)" }}>{description}</p>
              )}
            </div>
            {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
          </div>
          {children}
        </div>
      </main>
      {!noSidebar && (
        <div className="hidden lg:block">
          <RightSidebar />
        </div>
      )}
    </>
  );
}
