# Change Log

All notable changes to the "better-extension-manager" extension will be documented in this file.

## 1.2.0 - 2024-06-23

### Added

-  Added `better-extension-manager.cliPath` user setting to define the path to the VSCode CLI. This is useful when the VSCode CLI is not available in the default directory.

### Changed

- When syncing extensions, it will automatically restart VSCode extension host to apply changes. Before, it would ask for a full reload.

### Fixed

- Fixed an issue while uninstalling extensions where the dependencies were not being resolved correctly due to case sensitive comparison, resulting in error.

### Deprecated

- The `better-extension-manager.defineDefaultExtensions` and `better-extension-manager.restoreDefaultExtensions` commands are deprecated. Use `better-extension-manager.environments` instead.

For easy migrating you can just execute the `better-extension-manager.restoreDefaultExtensions` and `better-extension-manager.createGlobalEnvironment` respectively, or simply copy the configuration from the `better-extension-manager.default` setting to the `better-extension-manager.environments` setting.

### Other

- Updated dependencies.

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
