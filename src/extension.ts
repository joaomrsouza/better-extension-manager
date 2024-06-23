import { existsSync } from "fs";
import { dirname, join } from "path";
import * as vscode from "vscode";

// ! LIMITATIONS: ALL EXTENSIONS MUST BE ENABLED
// ! LIMITATIONS: REQUIRES VSCODE CLI

interface TaskResult {
  executed: boolean;
  msg: string;
  task: vscode.Task | undefined;
}

export function activate(context: vscode.ExtensionContext) {
  const doNotTouchExtensions = ["joaomrsouza.better-extension-manager"];

  function showMsg(
    msg: string,
    type: "error" | "warning" | "info" = "info",
    options: string[] = []
  ) {
    if (type === "error") {
      return vscode.window.showErrorMessage(
        `Better Extension Manager: ${msg}`,
        ...options
      );
    } else if (type === "warning") {
      return vscode.window.showWarningMessage(
        `Better Extension Manager: ${msg}`,
        ...options
      );
    } else if (type === "info") {
      return vscode.window.showInformationMessage(
        `Better Extension Manager: ${msg}`,
        ...options
      );
    }
  }

  function confirmDialog(placeHolder = "Are you sure?") {
    return vscode.window.showQuickPick(["No", "Yes"], {
      placeHolder,
    });
  }

  function fixPathSpaces(path: string) {
    const pathSegments = path.split("\\");
    const fixedPathSegments = pathSegments.map((segment) => {
      if (segment.includes(" ")) {
        return `'${segment}'`;
      }
      return segment;
    });

    return fixedPathSegments.join("\\");
  }

  function getVSCodeCliPath() {
    const customCLIPath = vscode.workspace
      .getConfiguration("better-extension-manager")
      .get<string>("cliPath");

    if (customCLIPath) {
      return fixPathSpaces(customCLIPath);
    }

    // const shellPath = vscode.env.shell;
    const vscodePath = process.execPath;
    const isWindows = process.platform === "win32";

    if (isWindows) {
      // On Windows, the CLI executable is 'code.cmd' or 'code.exe'
      const basePath = dirname(vscodePath);
      const cliCmd = join(basePath, "bin", "code.cmd");
      if (existsSync(cliCmd)) {
        return fixPathSpaces(cliCmd);
      }

      const cliExe = join(basePath, "bin", "code.exe");
      if (existsSync(cliExe)) {
        return fixPathSpaces(cliExe);
      }
    } else {
      // On macOS and Linux, the CLI executable is 'code'
      const basePath = dirname(dirname(vscodePath));
      const cli = join(basePath, "bin", "code");

      if (existsSync(cli)) {
        return cli;
      }
    }

    showMsg(
      "Failed to find the VSCode CLI. Please set a custom path in the settings (better-extension-manager.cliPath).",
      "error"
    );

    throw new Error("could not find VSCode CLI path");
  }

  function filterExtensions(extensions: vscode.Extension<any>[]) {
    return extensions.filter(
      (e) => !(e.packageJSON.isBuiltin || doNotTouchExtensions.includes(e.id))
    );
  }

  function resolveDependencies(extensions: vscode.Extension<any>[]) {
    const extList = filterExtensions(extensions).map((e) => ({
      id: e.id.toLowerCase(),
      extension: e,
      dependencies: (
        (e.packageJSON.extensionDependencies as string[]) ?? []
      ).map((d) => d.toLowerCase()),
      extensionPack: ((e.packageJSON.extensionPack as string[]) ?? []).map(
        (d) => d.toLowerCase()
      ),
      canBeUninstalled: false,
    }));

    const orderedExtList: typeof extList = [];

    const maxTries = extList.length * 2;
    let tries = 0;
    let lastListLength = 0;

    while (orderedExtList.length !== extList.length) {
      extList.forEach((e) => {
        if (e.canBeUninstalled) {
          return;
        }

        let canBeUninstalled = false;

        // Conditions to uninstall

        if (
          extList.filter((el) => el.dependencies?.includes(e.id)).length === 0 // If it's not anyone dependence it can
        ) {
          if (e.extensionPack.length === 0) {
            canBeUninstalled = true;
          } else if (
            e.extensionPack.every(
              (epId) =>
                (
                  extList.find((el) => el.id === epId) ?? {
                    canBeUninstalled: true,
                  }
                ).canBeUninstalled // If it's extensions pack: can, if all of the pack extensions can be uninstalled
            )
          ) {
            canBeUninstalled = true;
          }
        } else if (
          extList
            .filter((el) => el.dependencies?.includes(e.id))
            .every((el) => el.canBeUninstalled)
        ) {
          // If it's anyone dependence and all the dependent extensions can be uninstalled, it can
          canBeUninstalled = true;
        }

        if (
          canBeUninstalled &&
          !orderedExtList.map((e) => e.id).includes(e.id)
        ) {
          orderedExtList.push({
            ...e,
            canBeUninstalled,
          });
        }
      });
      orderedExtList.forEach((e) => {
        const ex = extList.find((el) => el.id === e.id);
        if (ex) {
          ex.canBeUninstalled = true;
        }
      });

      if (orderedExtList.length === lastListLength) {
        tries++;
      }

      if (tries >= maxTries) {
        showMsg(
          "It wasn't possible to completely resolve the dependencies! The resolved ones will be uninstalled, please execute the command again after reload or uninstall the remaining extensions manually.",
          "warning"
        );
        return orderedExtList;
      }

      lastListLength = orderedExtList.length;
    }
    return orderedExtList;
  }

  function installExtensions(extensions: string[]) {
    return new Promise<TaskResult>((resolve, _reject) => {
      if (extensions.length === 0) {
        return resolve({
          executed: false,
          msg: "No extensions to install",
          task: undefined,
        });
      }

      const install = new vscode.ShellExecution(
        `${getVSCodeCliPath()} --install-extension ${extensions.join(
          " --install-extension "
        )}`
      );
      const task = new vscode.Task(
        { type: "better-extension-manager" },
        vscode.TaskScope.Workspace,
        "Installing Extensions",
        "better-extension-manager",
        install
      );
      task.isBackground = true;

      vscode.tasks.executeTask(task);
      vscode.tasks.onDidEndTask((e) => {
        if (e.execution.task.name === task.name) {
          return resolve({
            executed: true,
            msg: "Task finished",
            task: e.execution.task,
          });
        }
      });
    });
  }

  function uninstallExtensions(extensions: vscode.Extension<any>[]) {
    return new Promise<TaskResult>((resolve, _reject) => {
      const filteredExtensions = filterExtensions(extensions);

      if (filteredExtensions.length === 0) {
        return resolve({
          executed: false,
          msg: "No extensions to uninstall",
          task: undefined,
        });
      }

      const toUninstall = resolveDependencies(filteredExtensions).map(
        (e) => e.id
      );

      const uninstall = new vscode.ShellExecution(
        `${getVSCodeCliPath()} --uninstall-extension ${toUninstall.join(
          " --uninstall-extension "
        )}`
      );
      const task = new vscode.Task(
        { type: "better-extension-manager" },
        vscode.TaskScope.Workspace,
        "Uninstalling Extensions",
        "better-extension-manager",
        uninstall
      );
      task.isBackground = true;

      vscode.tasks.executeTask(task);
      vscode.tasks.onDidEndTask((e) => {
        if (e.execution.task.name === task.name) {
          return resolve({
            executed: true,
            msg: "Task finished",
            task: e.execution.task,
          });
        }
      });
    });
  }

  function getInstalledExtensions() {
    return [...vscode.extensions.all].map((e) => ({
      ...e,
      id: e.id.toLowerCase(),
    }));
  }

  function manageExtensions(wantedExtension: string[], contextMsg: string) {
    const installedExtensions = getInstalledExtensions();

    // Todas as dependências das extensões que estão e continuarão instaladas, não podem ser desinstaladas
    const notToUninstall = installedExtensions
      .filter((e) => wantedExtension.includes(e.id))
      .map((e) => (e.packageJSON.extensionDependencies as string[]) ?? [])
      .flat();

    // Desinstala as extensões não requeridas
    const toUninstall = installedExtensions.filter(
      (e) => !(wantedExtension.includes(e.id) || notToUninstall.includes(e.id))
    );
    // Instala as extensões requeridas que não estão instaladas
    const toInstall = wantedExtension.filter(
      (e) => !installedExtensions.map((ie) => ie.id).includes(e)
    );

    uninstallExtensions(toUninstall).then((uninstallTask) => {
      installExtensions(toInstall).then((installTask) => {
        if (uninstallTask.executed || installTask.executed) {
          showMsg(`${contextMsg}: Finished.`);
          showMsg(
            `${contextMsg}: Restarting VSCode extension host.`,
            "warning"
          )?.then(() => {
            vscode.commands.executeCommand(
              "workbench.action.restartExtensionHost"
            );
          });
        } else {
          showMsg(`${contextMsg}: Already up to date.`);
        }
      });
    });
  }

  const cmdDefineDefaultExtensions = vscode.commands.registerCommand(
    "better-extension-manager.defineDefaultExtensions",
    async () => {
      const option = await confirmDialog(
        "Are you sure you want to define current extensions as default?"
      );
      if (option !== "Yes") {
        return;
      }

      const installedExtensions = filterExtensions(
        getInstalledExtensions()
      ).map((e) => e.id);

      vscode.workspace
        .getConfiguration("better-extension-manager")
        .update(
          "default",
          installedExtensions,
          vscode.ConfigurationTarget.Global
        );
      showMsg("Current enabled extensions defined as default.");
    }
  );

  const cmdRestoreDefaultExtensions = vscode.commands.registerCommand(
    "better-extension-manager.restoreDefaultExtensions",
    async () => {
      const option = await confirmDialog(
        "Are you sure you want to restore the default extensions?"
      );
      if (option !== "Yes") {
        return;
      }
      const extensionsDefaultConfig = Array.from(
        new Set(
          vscode.workspace
            .getConfiguration("better-extension-manager")
            .get<string[]>("default")
            ?.map((e) => e.toLowerCase())
        )
      );

      showMsg(
        "Restoring default extensions. Note that this process may take several minutes depending on the number of extensions to be installed."
      );
      extensionsDefaultConfig &&
        manageExtensions(
          extensionsDefaultConfig,
          "Restoring default extensions"
        );
    }
  );

  const cmdDefineWorkspaceExtensions = vscode.commands.registerCommand(
    "better-extension-manager.defineWorkspaceExtensions",
    async () => {
      const option = await confirmDialog(
        "Are you sure you want to define current extensions to this workspace?"
      );
      if (option !== "Yes") {
        return;
      }

      const installedExtensions = filterExtensions(
        getInstalledExtensions()
      ).map((e) => e.id);

      vscode.workspace
        .getConfiguration("better-extension-manager")
        .update(
          "workspace",
          installedExtensions,
          vscode.ConfigurationTarget.Workspace
        );
      showMsg("Current enabled extensions defined to this workspace.");
    }
  );

  const cmdRemoveGlobalExtensionsFromWorkspace =
    vscode.commands.registerCommand(
      "better-extension-manager.removeGlobalExtensionsFromWorkspace",
      async () => {
        const option = await confirmDialog(
          "Are you sure you want to remove global extensions from this workspace extension list?"
        );
        if (option !== "Yes") {
          return;
        }

        const extensionsWorkspaceConfig = vscode.workspace
          .getConfiguration("better-extension-manager")
          .get<string[]>("workspace")
          ?.map((e) => e.toLowerCase());

        const extensionsGlobalConfig = vscode.workspace
          .getConfiguration("better-extension-manager")
          .get<string[]>("global")
          ?.map((e) => e.toLowerCase());

        const extensions =
          extensionsWorkspaceConfig?.filter(
            (e) => !(extensionsGlobalConfig ?? []).includes(e)
          ) ?? [];

        vscode.workspace
          .getConfiguration("better-extension-manager")
          .update(
            "workspace",
            extensions,
            vscode.ConfigurationTarget.Workspace
          );

        showMsg(
          "Global extensions removed from this workspace extension list."
        );
      }
    );

  const cmdSyncExtensions = vscode.commands.registerCommand(
    "better-extension-manager.syncExtensions",
    async () => {
      const option = await confirmDialog(
        "Are you sure you want to sync extensions?"
      );
      if (option !== "Yes") {
        return;
      }

      const extensionsWorkspaceConfig = vscode.workspace
        .getConfiguration("better-extension-manager")
        .get<string[]>("workspace")
        ?.map((e) => e.toLowerCase());

      const extensionsGlobalConfig = vscode.workspace
        .getConfiguration("better-extension-manager")
        .get<string[]>("global")
        ?.map((e) => e.toLowerCase());

      const extensions = Array.from(
        new Set([
          ...(extensionsWorkspaceConfig ?? []),
          ...(extensionsGlobalConfig ?? []),
        ])
      );

      showMsg(
        "Syncing extensions with workspace and global. Note that this process may take several minutes depending on the number of extensions to be installed."
      );
      manageExtensions(extensions, "Syncing extensions");
    }
  );

  const cmdCreateGlobalEnvironment = vscode.commands.registerCommand(
    "better-extension-manager.createGlobalEnvironment",
    async () => {
      const environmentName = await vscode.window.showInputBox({
        prompt: "Enter the name of the environment",
        validateInput: (value) =>
          value.trim().length > 0 ? null : "Name cannot be empty",
      });

      if (!environmentName) {
        return;
      }

      const extensions = filterExtensions(getInstalledExtensions()).map(
        (e) => e.id
      );

      const environments = vscode.workspace
        .getConfiguration("better-extension-manager")
        .get("environments", {});

      vscode.workspace
        .getConfiguration("better-extension-manager")
        .update(
          "environments",
          { ...environments, [environmentName]: extensions },
          vscode.ConfigurationTarget.Global
        );

      showMsg(environmentName ?? "No environment name provided");
    }
  );

  const cmdDeleteGlobalEnvironment = vscode.commands.registerCommand(
    "better-extension-manager.deleteGlobalEnvironment",
    async () => {
      const availableEnvironments = vscode.workspace
        .getConfiguration("better-extension-manager")
        .get<Record<string, string[]>>("environments", {});

      if (Object.keys(availableEnvironments).length === 0) {
        return showMsg("No environments available.");
      }

      const environmentName = await vscode.window.showQuickPick(
        Object.keys(availableEnvironments),
        {
          placeHolder: "Select the environment to delete",
        }
      );

      if (!environmentName) {
        return;
      }

      const option = await confirmDialog(
        `Are you sure you want to delete the environment "${environmentName}"?`
      );
      if (option !== "Yes") {
        return;
      }

      const newEnvironments: Record<string, string[]> = {};

      Object.keys(availableEnvironments)
        .filter((e) => e !== environmentName)
        .forEach((e) => {
          newEnvironments[e] = availableEnvironments[e];
        });

      vscode.workspace
        .getConfiguration("better-extension-manager")
        .update(
          "environments",
          newEnvironments,
          vscode.ConfigurationTarget.Global
        );

      showMsg(`Environment "${environmentName}" deleted.`);
    }
  );

  const cmdUseGlobalEnvironment = vscode.commands.registerCommand(
    "better-extension-manager.useGlobalEnvironment",
    async () => {
      const availableEnvironments = vscode.workspace
        .getConfiguration("better-extension-manager")
        .get<Record<string, string[]>>("environments", {});

      if (Object.keys(availableEnvironments).length === 0) {
        return showMsg("No environments available.");
      }

      const environmentName = await vscode.window.showQuickPick(
        Object.keys(availableEnvironments),
        {
          placeHolder: "Select the environment to use",
        }
      );

      if (!environmentName) {
        return;
      }

      const option = await confirmDialog(
        `Are you sure you want to use the environment "${environmentName}"?`
      );
      if (option !== "Yes") {
        return;
      }

      const extensions = availableEnvironments[environmentName]?.map((e) =>
        e.toLowerCase()
      );

      showMsg(
        `Using global environment "${environmentName}". Note that this process may take several minutes depending on the number of extensions to be installed.`
      );
      manageExtensions(
        extensions,
        `Using global environment "${environmentName}"`
      );
    }
  );

  const cmdDebug = vscode.commands.registerCommand(
    "better-extension-manager.debug",
    () => {
      // Built-in extensions
      // packageJSON.isBuiltin
      // Dependencies
      // packageJSON.extensionDependencies
      // Extension packs
      // packageJSON.extensionPack
      showMsg("Debug command for development purposes.");
    }
  );

  context.subscriptions.push(cmdDefineDefaultExtensions);
  context.subscriptions.push(cmdRestoreDefaultExtensions);
  context.subscriptions.push(cmdDefineWorkspaceExtensions);
  context.subscriptions.push(cmdRemoveGlobalExtensionsFromWorkspace);
  context.subscriptions.push(cmdSyncExtensions);
  context.subscriptions.push(cmdCreateGlobalEnvironment);
  context.subscriptions.push(cmdDeleteGlobalEnvironment);
  context.subscriptions.push(cmdUseGlobalEnvironment);
  context.subscriptions.push(cmdDebug);
}

// This method is called when your extension is deactivated
export function deactivate() {}
