#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🗄️  Applying database changes...\n');

// Check if Supabase is configured
if (!fs.existsSync('.env.local')) {
  console.log('⚠️  .env.local not found. Skipping database updates.');
  console.log('💡 Set up your environment variables to enable auto-database updates.\n');
  process.exit(0);
}

try {
  // Check if supabase is linked
  console.log('🔗 Checking Supabase connection...');
  execSync('supabase status', { stdio: 'pipe' });

  // Apply schema changes
  console.log('📋 Applying schema changes...');
  execSync('supabase db reset', {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  // Generate fresh TypeScript types
  console.log('🔧 Generating TypeScript types...');
  execSync('npm run supabase:gen-types', {
    stdio: 'inherit',
    cwd: process.cwd()
  });

  const timestamp = new Date().toLocaleTimeString();
  console.log(`\n✅ Database changes applied successfully at ${timestamp}!\n`);

} catch (error) {
  if (error.message.includes('not linked') || error.message.includes('ENOENT')) {
    console.log('⚠️  Supabase not linked or CLI not available.');
    console.log('💡 To enable auto-database updates:');
    console.log('   1. Install Supabase CLI: npm install -g supabase');
    console.log('   2. Login: supabase login');
    console.log('   3. Link project: supabase link --project-ref <your-project-ref>\n');
  } else {
    console.error('\n❌ Error applying database changes:');
    console.error(error.message);
  }
  console.log('🚀 Next.js development continues without database auto-updates.\n');
  process.exit(0); // Don't fail, just warn
}