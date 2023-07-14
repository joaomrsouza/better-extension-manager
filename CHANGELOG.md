# Change Log

All notable changes to the "extension-manager" extension will be documented in this file.

## 1.1.0 - 2023-07-14

### Fixed

- It may get stuck when trying to resolve extension dependency. Issue [#2](https://github.com/joaomrsouza/extension-manager/issues/2).
- Escaping from the confirmation dialog was not working how it should.

### Added

- `extension-manager.removeGlobalExtensionsFromWorkspace` command.

## 1.0.1 - 2023-06-30

### Fixed

- Eventually installing task wasn't executing after uninstalling extensions.

## 1.0.0 - 2023-05-29

Release of extension manager.

### Added

- `extension-manager.global` user setting.
- `extension-manager.default` user setting.
- `extension-manager.environments` user setting.
- `extension-manager.workspace` workspace setting.
- `extension-manager.syncExtensions` command.
- `extension-manager.defineWorkspaceExtensions` command.
- `extension-manager.defineDefaultExtensions` command.
- `extension-manager.restoreDefaultExtensions` command.
- `extension-manager.createGlobalEnvironment` command.
- `extension-manager.deleteGlobalEnvironment` command.
- `extension-manager.useGlobalEnvironment` command.
- `extension-manager.debug` command.
