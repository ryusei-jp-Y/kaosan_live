const { execFileSync } = require("node:child_process");
const path = require("node:path");

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const appPath = path.join(context.appOutDir, appName);
  const entitlements = path.join(context.packager.projectDir, "resources", "entitlements.mac.plist");

  execFileSync(
    "/usr/bin/codesign",
    ["--deep", "--force", "--sign", "-", "--entitlements", entitlements, appPath],
    { stdio: "inherit" }
  );
};
