const { app, BrowserWindow, Tray, Menu, clipboard } = require('electron');
const path = require('path');
const url = require('url');
const notifier = require('node-notifier');
const db = require('../lib/db');
const autoLaunch = require('../lib/auto_launch');

let tray = null;
const template = [];
let contextMenu;

function isFirstTime() {
  return db.get('firstTime').value();
}

function displayBalloonFirstTime(delay = 20000) {
  // 20 second delay
  setTimeout(() => {
    const content = 'Take a break';
    const message = content;
    const icon = path.join(__dirname, '..', 'icons/64x64.png');
    if (process.platform === 'win32') {
      tray.displayBalloon({ title, content, icon });
    } else {
      notifier.notify({ title, message, icon });
    }
    displayBalloonFirstTime();
  }, delay);
}

function createTray() {
  tray = new Tray(path.join(__dirname, '..', 'icons/16x16.png'));
  tray.setToolTip('Click to show your clipboard history');

  template.push({
    label: 'Start with system',
    click: menuItem => {
      autoLaunch.toggle();
      menuItem.checked = !!menuItem.checked;
    },
    type: 'checkbox',
    checked: autoLaunch.isEnabled(),
  });

  template.push({
    label: 'About',
    click: () => {
      win.show();
    },
  });

  template.push({
    label: 'Exit',
    click: () => {
      app.exit();
    },
  });
  reloadContextMenu();

  tray.on('double-click', () => {
    tray.popUpContextMenu(contextMenu);
  });

  tray.on('click', () => {
    tray.popUpContextMenu(contextMenu);
  });

  displayBalloonFirstTime();
}

function reloadContextMenu() {
  contextMenu = Menu.buildFromTemplate(template);
  tray.setContextMenu(contextMenu);
}

function persistCopied(currentText) {
  const copied = db
    .get('copied')
    .push(currentText)
    .write();
  const length = copied.length;

  if (length > 10) {
    copied.splice(0, length - 10);
    db.set('copied', copied).write();
  }
}

function addTemplateItem(currentText, checked, persist) {
  if (!currentText) return;
  if (template.length === 3) {
    template.unshift({ type: 'separator' });
  }

  checked = checked !== false;
  persist = persist !== false;
  if (persist) persistCopied(currentText);

  const currentTextTrim = currentText.trim().replace(/\n/g, '\\n');

  template.unshift({
    label:
      currentTextTrim.length > 50
        ? `${currentTextTrim.substring(0, 50)}...`
        : currentTextTrim,
    click: () => {
      clipboard.writeText(currentText);
    },
    type: 'checkbox',
    checked,
  });

  reloadContextMenu();
}

module.exports = () => {
  const lock = !app.requestSingleInstanceLock();
  if (lock) {
    return app.quit();
  }

  global.win = new BrowserWindow({
    width: 320,
    height: 270,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    show: false,
    title,
    icon: path.join(__dirname, '..', 'icons/16x16.png'),
  });

  win.loadURL(
    url.format({
      pathname: path.join(__dirname, '..', 'index.html'),
      protocol: 'file:',
      slashes: true,
    })
  );

  win.setMenu(null);

  win.on('close', event => {
    event.preventDefault();
    win.hide();
  });

  createTray();
  displayBalloonFirstTime();
};
