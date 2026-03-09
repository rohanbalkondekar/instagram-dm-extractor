import { firefox } from 'playwright';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, 'bg-real.png');
const THREAD_URL = 'https://www.instagram.com/direct/t/17843941128344718/';

// Firefox profile source
const FF_PROFILES_DIR = path.join(os.homedir(), 'Library/Application Support/Firefox/Profiles');
const FF_PROFILE_NAME = 'dlzi76ig.default'; // Most recent profile with IG cookies
const TEMP_PROFILE = '/tmp/ff-ig-capture';

function copyFirefoxProfile() {
  const src = path.join(FF_PROFILES_DIR, FF_PROFILE_NAME);

  // Clean and recreate temp profile
  if (fs.existsSync(TEMP_PROFILE)) {
    fs.rmSync(TEMP_PROFILE, { recursive: true });
  }
  fs.mkdirSync(TEMP_PROFILE, { recursive: true });

  // Copy essential session files
  const files = [
    'cookies.sqlite', 'cookies.sqlite-wal', 'cookies.sqlite-shm',
    'webappsstore.sqlite', 'webappsstore.sqlite-wal',
    'storage.sqlite', 'cert9.db', 'key4.db', 'logins.json',
  ];
  for (const f of files) {
    const srcFile = path.join(src, f);
    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, path.join(TEMP_PROFILE, f));
    }
  }

  // Copy storage directory for localStorage
  const storageDir = path.join(src, 'storage');
  if (fs.existsSync(storageDir)) {
    execSync(`cp -r "${storageDir}" "${TEMP_PROFILE}/storage"`);
  }

  console.log('Copied Firefox profile with Instagram cookies');
}

async function main() {
  console.log('=== Instagram DM Background Capture ===\n');

  // Copy profile so we don't conflict with running Firefox
  copyFirefoxProfile();

  // Launch Firefox with the copied profile
  const context = await firefox.launchPersistentContext(TEMP_PROFILE, {
    headless: false,
    viewport: { width: 1280, height: 728 },
  });

  const page = context.pages()[0] || await context.newPage();

  console.log(`Navigating to ${THREAD_URL}`);
  await page.goto(THREAD_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Dismiss "Turn on Notifications" dialog if it appears
  try {
    const notifBtn = page.locator('button:has-text("Not Now")');
    if (await notifBtn.isVisible({ timeout: 3000 })) {
      await notifBtn.click();
      console.log('Dismissed notification dialog');
      await page.waitForTimeout(500);
    }
  } catch (_) {}

  // Wait for conversation to render
  try {
    await page.waitForSelector('div[role="main"]', { timeout: 15000 });
    console.log('Conversation loaded');
  } catch (_) {
    console.log('Warning: div[role="main"] not found, continuing...');
  }

  // Extra wait for images/avatars to fully load
  await page.waitForTimeout(4000);

  // Take the screenshot
  await page.screenshot({ path: OUTPUT_FILE, type: 'png' });
  console.log(`\nSaved: ${OUTPUT_FILE}`);

  await context.close();

  // Cleanup temp profile
  fs.rmSync(TEMP_PROFILE, { recursive: true, force: true });
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
