import * as core from "@actions/core";
import { getPlatform, OS } from "./platform";
import { valueOfVersion } from "./params";
import { WindowsInstaller } from "./installer_windows";
import { MacInstaller } from "./installer_mac";
import { LinuxInstaller } from "./installer_linux";
import path from "path";

const hasErrorMessage = (e: unknown): e is { message: string | Error } => {
  return typeof e === "object" && e !== null && "message" in e;
};

async function run(): Promise<void> {
  try {
    const version = valueOfVersion(core.getInput("edge-version") || "stable");
    const platform = getPlatform();

    core.info(`Setup Edge ${version}`);

    const installer = (() => {
      switch (platform.os) {
        case OS.WINDOWS:
          return new WindowsInstaller(platform);
        case OS.DARWIN:
          return new MacInstaller(platform);
        case OS.LINUX:
          return new LinuxInstaller(platform);
      }
    })();

    const result = await (async () => {
      const installed = await installer.checkInstalled(version);
      if (installed) {
        core.info(`Edge ${version} is already installed @ ${installed.root}`);
        return installed;
      }

      core.info(`Attempting to download Edge ${version}...`);
      const downloaded = await installer.download(version);

      core.info("Installing Edge...");
      const result = await installer.install(version, downloaded.archive);
      core.info(`Successfully setup Edge ${version}`);

      return result;
    })();

    const bin = path.join(result.root, result.bin);
    core.addPath(path.dirname(bin));

    await installer.test(version);
  } catch (error) {
    if (hasErrorMessage(error)) {
      core.setFailed(error.message);
    } else {
      core.setFailed(String(error));
    }
  }
}

run();
