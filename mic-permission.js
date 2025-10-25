// Microphone permission request page
document.addEventListener('DOMContentLoaded', () => {
  const enableBtn = document.getElementById('enableMic');
  const statusDiv = document.getElementById('status');

  enableBtn.addEventListener('click', async () => {
    try {
      statusDiv.textContent = 'Requesting permission...';
      statusDiv.className = 'status';

      // Request microphone access - THIS WILL SHOW THE PERMISSION PROMPT
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      console.log('✅ Microphone access granted!');
      
      // Stop the stream immediately (we just needed the permission)
      stream.getTracks().forEach(track => track.stop());

      // Save permission granted status
      await chrome.storage.local.set({ microphonePermissionGranted: true });

      statusDiv.textContent = '✅ Microphone access granted! You can close this window.';
      statusDiv.className = 'status success';

      // Close this window after 2 seconds
      setTimeout(() => {
        window.close();
      }, 2000);

    } catch (err) {
      console.error('❌ Microphone permission denied:', err);
      statusDiv.textContent = '❌ Permission denied. Please try again.';
      statusDiv.className = 'status error';
    }
  });
});
