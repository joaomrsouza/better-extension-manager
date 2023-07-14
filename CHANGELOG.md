# Change Log

All notable changes to the "better-extension-manager" extension will be documented in this file.

## 1.1.0 - 2023-07-14

### Fixed

- It may get stuck when trying to resolve extension dependency. Issue [#2](https://github.com/joaomrsouza/better-extension-manager/issues/2).
- Escaping from the confirmation dialog was not working how it should.

### Added

- `better-extension-manager.removeGlobalExtensionsFromWorkspace` command.

## 1.0.1 - 2023-06-30

### Fixed

- Eventually installing task wasn't executing after uninstalling extensions.

## 1.0.0 - 2023-05-29

Release of Better Extension Manager.

### Added

- `better-extension-manager.global` user setting.
- `better-extension-manager.default` user setting.
- `better-extension-manager.environments` user setting.
- `better-extension-manager.workspace` workspace setting.
- `better-extension-manager.syncExtensions` command.
- `better-extension-manager.defineWorkspaceExtensions` command.
- `better-extension-manager.defineDefaultExtensions` command.
- `better-extension-manager.restoreDefaultExtensions` command.
- `better-extension-manager.createGlobalEnvironment` command.
- `better-extension-manager.deleteGlobalEnvironment` command.
- `better-extension-manager.useGlobalEnvironment` command.
- `better-extension-manager.debug` command.
