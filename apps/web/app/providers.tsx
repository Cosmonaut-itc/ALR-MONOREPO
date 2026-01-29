// In Next.js, this file would be called: app/providers.tsx
'use memo';
'use client';

// Since QueryClientProvider relies on useContext under the hood, we have to put 'use client' on top
import { QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { getQueryClient } from '@/app/get-query-client';

const ReactQueryDevtools = dynamic(
	() =>
		import('@tanstack/react-query-devtools').then(
			(mod) => mod.ReactQueryDevtools,
		),
	{ ssr: false },
);

export default function Providers({ children }: { children: React.ReactNode }) {
	// NOTE: Avoid useState when initializing the query client if you don't
	//       have a suspense boundary between this and the code that may
	//       suspend because React will throw away the client on the initial
	//       render if it suspends and there is no boundary
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			{process.env.NODE_ENV === 'development' && (
				<ReactQueryDevtools initialIsOpen={false} />
			)}
			{children}
		</QueryClientProvider>
	);
}
