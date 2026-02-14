const SftpClient = require('ssh2-sftp-client');
const path = require('path');
const fs = require('fs');

async function upload() {
  const sftp = new SftpClient();
  const config = {
    host: 'axicld.duckdns.org',
    port: 2022,
    username: 'eduardo.47902b5e',
    password: 'tataravo'
  };

  try {
    console.log('Connecting...');
    await sftp.connect(config);
    console.log('Connected.');

    sftp.on('upload', info => {
      console.log(`Uploaded: ${info.source}`);
    });

    // Helper to ensure remote dir exists
    const ensureDir = async (dir) => {
      try {
        await sftp.mkdir(dir, true);
      } catch (e) {
        // ignore if exists
      }
    };

    // Upload folders
    const folders = ['src', 'public', 'prisma', 'scripts']; // Explicit source folders
    for (const folder of folders) {
        const local = path.join(__dirname, folder);
        if (fs.existsSync(local)) {
            console.log(`Starting upload of folder: ${folder}...`);
            await ensureDir(folder);
            // uploadDir(local, remote) uploads CONTENTS of local to remote
            // So uploadDir(src, src)
            await sftp.uploadDir(local, folder);
            console.log(`Finished folder: ${folder}`);
        } else {
            console.log(`Skipping missing folder: ${folder}`);
        }
    }

    // Upload root files
    const files = ['package.json', 'package-lock.json', 'tsconfig.json', 'next.config.ts', '.env.local', 'postcss.config.mjs', 'next-env.d.ts', 'README.md', 'vercel.json', 'run_migration_pg.js'];
    for (const file of files) {
        const local = path.join(__dirname, file);
        if (fs.existsSync(local)) {
            console.log(`Uploading file: ${file}...`);
            await sftp.put(local, file);
        }
    }
    
    console.log('✅ Upload finished!');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    sftp.end();
  }
}

upload();
