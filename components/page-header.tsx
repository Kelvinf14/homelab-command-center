export function PageHeader({
  title,
  eyebrow,
  description
}: {
  title: string;
  eyebrow?: string;
  description?: string;
}) {
  return (
    <header className="mb-6">
      {eyebrow ? <div className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-primary">{eyebrow}</div> : null}
      <h1 className="text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">{title}</h1>
      {description ? <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p> : null}
    </header>
  );
}
