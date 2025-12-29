import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-linear-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black p-4">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-bold bg-linear-to-r from-green-600 to-green-300 bg-clip-text text-transparent">
            EventFlow
          </span>
        </Link>
      </div>

      <div className="w-full max-w-md">{children}</div>

      <p className="mt-8 text-center text-sm text-zinc-500">
        &copy; {new Date().getFullYear()} EventFlow. All rights reserved.
      </p>
    </div>
  );
}
