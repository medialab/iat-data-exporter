'use strict';
const electron = require('electron');

const app = electron.app;

const express = require(__dirname + '/resources/app/express');
let shutDownServer;

// adds debug features like hotkeys for triggering dev tools and reload
require('electron-debug')();

// prevent window being garbage collected
let mainWindow;

function onClosed() {
	// dereference the window
	// for multiple windows store them in an array
	mainWindow = null;
}

function createMainWindow() {
	shutDownServer = express();
	const win = new electron.BrowserWindow({
		width: 800,
		height: 500,
		autoHideMenuBar: true,
    useContentSize: true,
    resizable: false
	});

	win.loadURL('http://localhost:3000');
	win.on('closed', onClosed);

	return win;
}

app.on('window-all-closed', () => {
	shutDownServer();
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	if (!mainWindow) {
		mainWindow = createMainWindow();
	}
});

app.on('ready', () => {
	mainWindow = createMainWindow();
});
