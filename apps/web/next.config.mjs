/** @type {import('next').NextConfig} */
const nextConfig = {
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		unoptimized: true,
	},
	reactCompiler: true,
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
