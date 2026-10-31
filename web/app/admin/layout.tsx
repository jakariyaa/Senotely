import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <nav aria-label="Admin" className="flex flex-wrap gap-2 border-b pb-4">
        {[
          ['/admin/users', 'Users'],
          ['/admin/notes', 'Notes'],
          ['/admin/interests', 'Interests'],
        ].map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
