const { autoUpdater } = require('electron-updater');
const { app, dialog } = require('electron');

let _silentUpdateCheck = false;

module.exports = function createUpdater({ log, getWindow }) {

  function setup() {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => {
      if (!_silentUpdateCheck) log('[UPDATE] Checking for app updates...\n');
    });

    autoUpdater.on('update-available', (info) => {
      log(`[UPDATE] New version available: v${info.version}\n`);
      dialog.showMessageBox(getWindow(), {
        type: 'info',
        title: 'Update Available',
        message: `Version ${info.version} is available!`,
        detail: `You are running v${app.getVersion()}.\n\nDownload and install the update now?`,
        buttons: ['Download & Install', 'Later'],
        defaultId: 0
      }).then(({ response }) => {
        if (response === 0) {
          log('[UPDATE] Downloading update...\n');
          autoUpdater.downloadUpdate();
        } else {
          log('[UPDATE] Update postponed.\n');
        }
      });
    });

    autoUpdater.on('update-not-available', () => {
      if (!_silentUpdateCheck) log('[UPDATE] App is up to date.\n');
      _silentUpdateCheck = false;
    });

    autoUpdater.on('download-progress', (progress) => {
      log(`[UPDATE] Downloading update: ${Math.floor(progress.percent)}%\r`);
    });

    autoUpdater.on('update-downloaded', () => {
      log('\n[UPDATE] Update ready — restart to install.\n');
      dialog.showMessageBox(getWindow(), {
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded!',
        detail: 'The app will restart to apply the update.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0
      }).then(({ response }) => {
        if (response === 0) autoUpdater.quitAndInstall();
      });
    });

    autoUpdater.on('error', (err) => {
      if (!_silentUpdateCheck) log(`[UPDATE] App update error: ${err.message}\n`);
      _silentUpdateCheck = false;
    });
  }

  function checkForUpdates(silent = false) {
    if (!app.isPackaged) {
      if (!silent) log('[UPDATE] Dev mode — app update check skipped.\n');
      return;
    }

    _silentUpdateCheck = silent;

    autoUpdater.checkForUpdates().catch((err) => {
      if (!silent) log(`[UPDATE] Failed to check for app updates: ${err.message}\n`);
      _silentUpdateCheck = false;
    });
  }

  return { setup, checkForUpdates };
};
