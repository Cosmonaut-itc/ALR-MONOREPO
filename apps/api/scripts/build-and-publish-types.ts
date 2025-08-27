#!/usr/bin/env bun

/** biome-ignore-all lint/suspicious/useAwait: we're using execSync */
/** biome-ignore-all lint/suspicious/noConsole: we're using console.log */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TYPES_DIR = 'packages/api-types';
const PACKAGE_JSON_PATH = join(TYPES_DIR, 'package.json');

interface PackageJson {
	name: string;
	version: string;
	// biome-ignore lint/suspicious/noExplicitAny: we're using any
	[key: string]: any;
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

	try {
		// Read current package.json
		console.log('📖 Reading package configuration...');
		const packageJsonContent = readFileSync(PACKAGE_JSON_PATH, 'utf-8');
		const packageJson: PackageJson = JSON.parse(packageJsonContent);

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
		execSync('npm publish', { cwd: TYPES_DIR, stdio: 'inherit' });

		console.log(`🎉 Successfully published ${packageJson.name}@${newVersion}`);
		console.log('');
		console.log('📝 To use in your client application:');
		console.log(`   npm install ${packageJson.name}@${newVersion}`);
		console.log('   or');
		console.log(`   npm update ${packageJson.name}`);
	} catch (error) {
		console.error('❌ Build and publish failed:', error);

		// Try to restore the original version if we changed it
		try {
			const packageJsonContent = readFileSync(PACKAGE_JSON_PATH, 'utf-8');
			const packageJson: PackageJson = JSON.parse(packageJsonContent);
			const parts = packageJson.version.split('.').map(Number);
			parts[2]--; // Decrement back
			packageJson.version = parts.join('.');
			writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(packageJson, null, 2));
			console.log('🔄 Restored original version due to failure');
		} catch (restoreError) {
			console.error('⚠️ Could not restore original version:', restoreError);
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
