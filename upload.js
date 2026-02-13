const SftpClient = require('ssh2-sftp-client');
const path = require('path');

async function uploadFile() {
  const sftp = new SftpClient();
  const config = {
    host: 'axicld.duckdns.org',
    port: 2022,
    username: 'eduardo.47902b5e',
    password: 'tataravo'
  };

  try {
    await sftp.connect(config);
    console.log('Connected to SFTP');
    
    const localFile = path.join(__dirname, 'project.zip');
    const remoteFile = '/home/eduardo.47902b5e/project.zip'; // Probable path, or just 'project.zip' if root is home
    
    console.log(`Uploading ${localFile} to ${remoteFile}...`);
    await sftp.put(localFile, remoteFile);
    console.log('Upload completed successfully');
  } catch (err) {
    console.error('Error during SFTP upload:', err.message);
    
    // Try without path prefix if first fails
    try {
        console.log('Retrying with simple filename...');
        await sftp.put(path.join(__dirname, 'project.zip'), 'project.zip');
        console.log('Upload (retry) completed successfully');
    } catch (retryErr) {
        console.error('Retry failed:', retryErr.message);
    }
  } finally {
    await sftp.end();
  }
}

uploadFile();
