export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
          ParaPrint
        </h1>
        <p className="mt-4 text-xl text-muted-foreground">Coming soon</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Parametric G-code generator for 3D printing — no slicer needed.
        </p>
      </div>
    </main>
  );
}
