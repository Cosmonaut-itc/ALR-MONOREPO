#!/usr/bin/env bun

/** biome-ignore-all lint/suspicious/useAwait: we're using execSync */
/** biome-ignore-all lint/suspicious/noConsole: we're using console.log */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TYPES_DIR = 'packages/api-types';
const PACKAGE_JSON_PATH = join(TYPES_DIR, 'package.json');
const PACKAGE_LOCK_PATH = join(TYPES_DIR, 'package-lock.json');

interface PackageJson {
	name: string;
	version: string;
	// biome-ignore lint/suspicious/noExplicitAny: we're using any
	[key: string]: any;
}

function ensureNpmAuth() {
	try {
		// NOTE: npm will sometimes return 404s for unauthenticated requests;
		// a quick whoami check gives a clearer error before we bump versions.
		execSync('npm whoami', { cwd: TYPES_DIR, stdio: 'inherit' });
	} catch {
		throw new Error(
			[
				'npm authentication failed.',
				'Run one of the following, then retry:',
				'  - npm login',
				'  - or set a valid NPM_TOKEN in your environment/CI',
			].join('\n'),
		);
	}
}

/**
 * Increments the patch version (x.x.X) of a semver string
 */
function incrementPatchVersion(version: string): string {
	const parts = version.split('.').map(Number);
	if (parts.length !== 3 || parts.some(Number.isNaN)) {
		throw new Error(`Invalid version format: ${version}`);
	}

	parts[2]++; // Increment patch version
	return parts.join('.');
}

/**
 * Builds and publishes the API types package
 */
async function buildAndPublishTypes() {
	console.log('🚀 Starting automated build and publish process...');

	let originalPackageJsonContent: string | null = null;
	let originalPackageLockContent: string | null = null;

	try {
		// Read current package.json
		console.log('📖 Reading package configuration...');
		originalPackageJsonContent = readFileSync(PACKAGE_JSON_PATH, 'utf-8');
		const packageJson: PackageJson = JSON.parse(originalPackageJsonContent);

		if (existsSync(PACKAGE_LOCK_PATH)) {
			originalPackageLockContent = readFileSync(PACKAGE_LOCK_PATH, 'utf-8');
		}

		// Fail fast before bumping versions / running builds
		console.log('🔐 Checking npm authentication...');
		ensureNpmAuth();

		const currentVersion = packageJson.version;
		const newVersion = incrementPatchVersion(currentVersion);

		console.log(`📦 Version update: ${currentVersion} → ${newVersion}`);

		// Update version in package.json
		packageJson.version = newVersion;
		writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2));
		console.log('✅ Updated package.json version');

		// Clean previous build
		console.log('🧹 Cleaning previous build...');
		execSync('npm run clean', { cwd: TYPES_DIR, stdio: 'inherit' });

		// Build the types package
		console.log('🔨 Building types package...');
		execSync('npm run build', { cwd: TYPES_DIR, stdio: 'inherit' });
		console.log('✅ Types package built successfully');

		// Publish to npm (or your private registry)
		console.log('📡 Publishing to npm...');
		execSync('npm publish --access public', { cwd: TYPES_DIR, stdio: 'inherit' });

		console.log(`🎉 Successfully published ${packageJson.name}@${newVersion}`);
		console.log('');
		console.log('📝 To use in your client application:');
		console.log(`   npm install ${packageJson.name}@${newVersion}`);
		console.log('   or');
		console.log(`   npm update ${packageJson.name}`);
	} catch (error) {
		console.error('❌ Build and publish failed:', error);

		// Restore exact original files to avoid leaving the repo in a half-updated state.
		try {
			if (originalPackageJsonContent != null) {
				writeFileSync(PACKAGE_JSON_PATH, originalPackageJsonContent);
			}
			if (originalPackageLockContent != null) {
				writeFileSync(PACKAGE_LOCK_PATH, originalPackageLockContent);
			}
			console.log('🔄 Restored original files due to failure');
		} catch (restoreError) {
			console.error('⚠️ Could not restore original files:', restoreError);
		}

		process.exit(1);
	}
}

/**
 * Builds types without publishing (for development)
 */
async function buildTypesOnly() {
	console.log('🔨 Building types package (development mode)...');

	try {
		// Install dependencies
		execSync('npm install', { cwd: TYPES_DIR, stdio: 'inherit' });

		// Clean and build
		execSync('npm run clean', { cwd: TYPES_DIR, stdio: 'inherit' });
		execSync('npm run build', { cwd: TYPES_DIR, stdio: 'inherit' });

		console.log('✅ Types package built successfully (not published)');
	} catch (error) {
		console.error('❌ Build failed:', error);
		process.exit(1);
	}
}

// Check command line arguments
const args = process.argv.slice(2);
const shouldPublish = !args.includes('--no-publish');

if (shouldPublish) {
	buildAndPublishTypes();
} else {
	buildTypesOnly();
}
