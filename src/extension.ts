import * as vscode from "vscode";

// ! LIMITATIONS: ALL EXTENSIONS MUST BE ENABLED
// ! LIMITATIONS: REQUIRES VSCODE CLI

interface TaskResult {
  executed: boolean;
  msg: string;
  task: vscode.Task | undefined;
}

export function activate(context: vscode.ExtensionContext) {
  const doNotTouchExtensions = ["joaomrsouza.extension-manager"];

  function showMsg(
    msg: string,
    type: "error" | "warning" | "info" = "info",
    options: string[] = []
  ) {
    if (type === "error") {
      return vscode.window.showErrorMessage(
        `Extension Manager: ${msg}`,
        ...options
      );
    } else if (type === "warning") {
      return vscode.window.showWarningMessage(
        `Extension Manager: ${msg}`,
        ...options
      );
    } else if (type === "info") {
      return vscode.window.showInformationMessage(
        `Extension Manager: ${msg}`,
        ...options
      );
    }
  }

  function confirmDialog(placeHolder = "Are you sure?") {
    return vscode.window.showQuickPick(["No", "Yes"], {
      placeHolder,
    });
  }

  function filterExtensions(extensions: vscode.Extension<any>[]) {
    return extensions.filter(
      (e) => !(e.packageJSON.isBuiltin || doNotTouchExtensions.includes(e.id))
    );
  }

  // TODO: Fazer fluxo de parada se ficar preso
  function resolveDependencies(extensions: vscode.Extension<any>[]) {
    const extList = filterExtensions(extensions).map((e) => ({
      id: e.id,
      extension: e,
      dependencies: (e.packageJSON.extensionDependencies as string[]) ?? [],
      extensionPack: (e.packageJSON.extensionPack as string[]) ?? [],
      canBeUninstalled: false,
    }));

    const orderedExtList: typeof extList = [];

    while (orderedExtList.length !== extList.length) {
      extList.forEach((e) => {
        if (e.canBeUninstalled) {
          return;
        }

        let canBeUninstalled = false;

        // ? Posso desinstalar

        if (
          extList.filter((el) => el.dependencies?.includes(e.id)).length === 0 // Se não for dependência de ninguém: pode
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
                ).canBeUninstalled // Se for extensions pack: pode, Se todas as extensões do pack puderem ser desinstaladas: pode
            )
          ) {
            canBeUninstalled = true;
          }
        } else if (
          extList
            .filter((el) => el.dependencies?.includes(e.id))
            .every((el) => el.canBeUninstalled)
        ) {
          // Se for dependência de alguém e todas as extensões que dependem dela puderem ser desinstaladas: pode
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
        `code --install-extension ${extensions.join(" --install-extension ")}`
      );
      const task = new vscode.Task(
        { type: "extension-manager" },
        vscode.TaskScope.Workspace,
        "Installing Extensions",
        "extension-manager",
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
        `code --uninstall-extension ${toUninstall.join(
          " --uninstall-extension "
        )}`
      );
      const task = new vscode.Task(
        { type: "extension-manager" },
        vscode.TaskScope.Workspace,
        "Uninstalling Extensions",
        "extension-manager",
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
    return [...vscode.extensions.all];
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
    Promise.all([
      uninstallExtensions(toUninstall),
      installExtensions(toInstall),
    ]).then(([uninstallTask, installTask]) => {
      if (uninstallTask.executed || installTask.executed) {
        showMsg(`${contextMsg}: Finished.`);
        showMsg(
          `${contextMsg}: Reload VSCode is highly recommended.`,
          "warning",
          ["Reload", "Cancel"]
        )?.then((option) => {
          if (option === "Reload") {
            vscode.commands.executeCommand("workbench.action.reloadWindow");
          }
        });
      } else {
        showMsg(`${contextMsg}: Already up to date.`);
      }
    });
  }

  const cmdDefineDefaultExtensions = vscode.commands.registerCommand(
    "extension-manager.defineDefaultExtensions",
    async () => {
      const option = await confirmDialog(
        "Are you sure you want to define current extensions as default?"
      );
      if (option === "No") {
        return;
      }

      const installedExtensions = filterExtensions(
        getInstalledExtensions()
      ).map((e) => e.id);

      vscode.workspace
        .getConfiguration("extension-manager")
        .update(
          "default",
          installedExtensions,
          vscode.ConfigurationTarget.Global
        );
      showMsg("Current enabled extensions defined as default.");
    }
  );

  const cmdRestoreDefaultExtensions = vscode.commands.registerCommand(
    "extension-manager.restoreDefaultExtensions",
    async () => {
      const option = await confirmDialog(
        "Are you sure you want to restore the default extensions?"
      );
      if (option === "No") {
        return;
      }
      const extensionsDefaultConfig = Array.from(
        new Set(
          vscode.workspace
            .getConfiguration("extension-manager")
            .get<string[]>("default")
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
    "extension-manager.defineWorkspaceExtensions",
    async () => {
      const option = await confirmDialog(
        "Are you sure you want to define current extensions to this workspace?"
      );
      if (option === "No") {
        return;
      }

      const installedExtensions = filterExtensions(
        getInstalledExtensions()
      ).map((e) => e.id);

      vscode.workspace
        .getConfiguration("extension-manager")
        .update(
          "workspace",
          installedExtensions,
          vscode.ConfigurationTarget.Workspace
        );
      showMsg("Current enabled extensions defined to this workspace.");
    }
  );

  const cmdSyncExtensions = vscode.commands.registerCommand(
    "extension-manager.syncExtensions",
    async () => {
      const option = await confirmDialog(
        "Are you sure you want to sync extensions?"
      );
      if (option === "No") {
        return;
      }

      const extensionsWorkspaceConfig = vscode.workspace
        .getConfiguration("extension-manager")
        .get<string[]>("workspace");

      const extensionsGlobalConfig = vscode.workspace
        .getConfiguration("extension-manager")
        .get<string[]>("global");

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
    "extension-manager.createGlobalEnvironment",
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
        .getConfiguration("extension-manager")
        .get("environments", {});

      vscode.workspace
        .getConfiguration("extension-manager")
        .update(
          "environments",
          { ...environments, [environmentName]: extensions },
          vscode.ConfigurationTarget.Global
        );

      showMsg(environmentName ?? "No environment name provided");
    }
  );

  const cmdDeleteGlobalEnvironment = vscode.commands.registerCommand(
    "extension-manager.deleteGlobalEnvironment",
    async () => {
      const availableEnvironments = vscode.workspace
        .getConfiguration("extension-manager")
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
      if (option === "No") {
        return;
      }

      const newEnvironments: Record<string, string[]> = {};

      Object.keys(availableEnvironments)
        .filter((e) => e !== environmentName)
        .forEach((e) => {
          newEnvironments[e] = availableEnvironments[e];
        });

      vscode.workspace
        .getConfiguration("extension-manager")
        .update(
          "environments",
          newEnvironments,
          vscode.ConfigurationTarget.Global
        );

      showMsg(`Environment "${environmentName}" deleted.`);
    }
  );

  const cmdUseGlobalEnvironment = vscode.commands.registerCommand(
    "extension-manager.useGlobalEnvironment",
    async () => {
      const availableEnvironments = vscode.workspace
        .getConfiguration("extension-manager")
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
      if (option === "No") {
        return;
      }

      const extensions = availableEnvironments[environmentName];

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
    "extension-manager.debug",
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
  context.subscriptions.push(cmdSyncExtensions);
  context.subscriptions.push(cmdCreateGlobalEnvironment);
  context.subscriptions.push(cmdDeleteGlobalEnvironment);
  context.subscriptions.push(cmdUseGlobalEnvironment);
  context.subscriptions.push(cmdDebug);
}

// This method is called when your extension is deactivated
export function deactivate() {}
