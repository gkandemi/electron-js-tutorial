const electron = require("electron");
const url = require("url");
const path = require("path");
const db = require("./lib/connection").db;

const { app, BrowserWindow, Menu, ipcMain } = electron;

let mainWindow, addWindow;

app.on("ready", () => {
  mainWindow = new BrowserWindow({
    frame: false
  });

  mainWindow.setResizable(false);

  // Pencerenin Oluşturulması...
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "pages/mainWindow.html"),
      protocol: "file:",
      slashes: true
    })
  );

  // Menünün Oluşturulması..
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  Menu.setApplicationMenu(mainMenu);

  ipcMain.on("todo:close", () => {
    app.quit();
    addWindow = null;
  });

  // NewTODO Penceresi Eventleri...
  ipcMain.on("newTodo:close", () => {
    addWindow.close();
    addWindow = null;
  });

  ipcMain.on("newTodo:save", (err, data) => {
    if (data) {
      db.query("INSERT INTO todos SET text = ?", data.todoValue, (e, r, f) => {
        if (r.insertId > 0) {
          mainWindow.webContents.send("todo:addItem", {
            id: r.insertId,
            text: data.todoValue
          });
        }
      });

      if (data.ref == "new") {
        addWindow.close();
        addWindow = null;
      }
    }
  });

  mainWindow.webContents.once("dom-ready", () => {
    db.query("SELECT * FROM todos", (error, results, fields) => {
      mainWindow.webContents.send("initApp", results);
    });
  });

  ipcMain.on("remove:todo", (e, id) => {
    db.query("DELETE FROM todos WHERE id = ?", id, (e, r, f) => {
      if (r.affectedRows > 0) {
        console.log("silme işlemi başarılıdır..");
      }
    });
  });
});

// Menü Template Yapısı
const mainMenuTemplate = [
  {
    label: "Dosya",
    submenu: [
      {
        label: "Yeni TODO Ekle",
        click() {
          createWindow();
        }
      },
      {
        label: "Tümünü Sil"
      },
      {
        label: "Çıkış",
        accelerator: process.platform == "darwin" ? "Command+Q" : "Ctrl+Q",
        role: "quit"
      }
    ]
  }
];
if (process.platform == "darwin") {
  mainMenuTemplate.unshift({
    label: app.getName(),
    role: "TODO"
  });
}
if (process.env.NODE_ENV !== "production") {
  mainMenuTemplate.push({
    label: "Geliştirici Araçları",
    submenu: [
      {
        label: "Geliştirici Araçları",
        click(item, focusedWindow) {
          focusedWindow.toggleDevTools();
        }
      },
      {
        label: "Yenile",
        role: "reload"
      }
    ]
  });
}

function createWindow() {
  addWindow = new BrowserWindow({
    width: 475,
    height: 175,
    title: "Yeni Bir Pencere",
    frame: false
  });

  addWindow.setResizable(false);

  addWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "pages/newTodo.html"),
      protocol: "file:",
      slashes: true
    })
  );

  addWindow.on("close", () => {
    addWindow = null;
  });
}
