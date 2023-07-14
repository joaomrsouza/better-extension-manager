# Better Extension Manager

**A VSCode extension to manage extensions.**

---

If you find yourself with many, many (many) extensions, your editor probably will become slower. But it's a pain to enable/disable extension by extension every time you need to work with something different, or maybe you could just pre setup some extensions to work with something, and another couple extensions to work in something else, and change between then easily.

**This extension is for you!**

## Features

- **Global extensions:** Set extensions to always be installed in your editor.
- **Workspace extensions:** Set extensions to be installed by the current workspace.
- **Environment extensions:** Create environments and set extensions to be installed when you select the defined environment.
- **Default extensions:** Set extensions and install then every time you need.

### In action:

Better Extension Manager will always maintain your editor cleaner, with only the extensions you need! Once setted up, just one command to change between workspace, environment or default extensions.

![In action](images/Better-Extension-Manager-Presentation.gif)

### Commands:

The core of this extension are available through commands.

List of the commands and what each one does:

#### Common Commands

For the extensions list, please refer to **Extension Settings**.

- `Sync Extensions`: Merge the `global` and `workspace` list of extensions and install all of then, while **uninstall** any other extensions that are installed. **Use this command every time you get into a workspace to work on.**
- `Define Workspace Extensions`: Sets a list of the current enabled extensions to the `workspace` workspace setting. **Use this command every time you want to setup a new extension to the current workspace, so it will be added to the workspace list.**

#### Other Commands

- `Remove Global Extensions from Workspace`: Removes all the extensions in `global` user setting from the `workspace` workspace setting.
- `Define Default Extensions`: Sets a list of the current enabled extensions to the `default` user setting.
- `Restore Default Extensions`: Install all extensions listed on the `default` user setting, while **uninstall** any other extensions that are installed.
- `Create Global Environment`: Sets a list of the current enabled extensions to the `environments` user setting with the given name for the environment.
- `Delete Global Environment`: Remove the environment with the given name of the `environments` user setting.
- `Use Global Environment`: Install all extensions listed on the `environments` user setting with the given name, while **uninstall** any other extensions that are installed.
- `Debug`: Debug command for development purposes.

### How it works?

This extension works by installing and uninstalling other extensions via VSCode's CLI. Be careful while managing your extensions.

**This extension will not delete any configurations of the uninstalled extensions.**

## Limitations

The VSCode API doesn't give access to disabled extensions, which impossibilites to just enable/disable extensions instead of install/uninstall.

For the same motive, in order to this extension manage other extensions correctly, **all your installed extensions must be enabled**, if some extensions are disabled it **may** get stuck while trying to uninstall other extensions because of extension dependency.

While installing/uninstalling extensions it's not possible to retrieve feedback to guarantee that everything worked correctly. A workaround is just execute the command again if you notice that some of the extensions were not installed/uninstalled.

## Requirements

For this extension work correctly you will need **VSCode CLI** installed and working. The CLI comes with the VSCode default installer.

If you want to have sure it is working just type the command bellow on your terminal:

```
$ code -v
```

## Extension Settings

The extension settings will define which extensions will be installed and when.

### User Settings
* `better-extension-manager.global`: List of extension ids that you want to always be installed.
* `better-extension-manager.default`: List of extension ids that you want to set as default. You can change to these extensions by running the `Restore Default Extensions` command.
* `better-extension-manager.environments`: Object with `[environmentName]: extensionIds[]` format. At any time you can run the `Use Global Environment` command to select the environment you want, so it's easy to change the extensions.

### Workspace Settings

* `better-extension-manager.workspace`: List of extension ids that you want to be installed on the workspace.

## Known Issues

- While trying to install/uninstall several (100+) extensions at once, it **may** get stuck. A workaround its just execute the command again **after a window reload**. You can follow the resolution in this issue [#1](https://github.com/joaomrsouza/better-extension-manager/issues/1)

## Release Notes

### 1.1.0 - 2023-07-14

#### Fixed

- It may get stuck when trying to resolve extension dependency. Issue [#2](https://github.com/joaomrsouza/better-extension-manager/issues/2).
- Escaping from the confirmation dialog was not working how it should.

#### Added

- `better-extension-manager.removeGlobalExtensionsFromWorkspace` command.
