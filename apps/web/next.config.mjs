/** @type {import('next').NextConfig} */
const nextConfig = {
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		unoptimized: true,
	},
	reactCompiler: true,
	// biome-ignore lint/suspicious/useAwait: we need to use await here
	async rewrites() {
		return [
			{
				source: "/api/auth/:path*",
				destination: `${process.env.BETTER_AUTH_URL}/api/auth/:path*`,
			},
		];
	},
};

export default nextConfig;
