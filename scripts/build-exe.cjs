const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist", "windows");
const appDir = path.join(distDir, "app");
const launcherPath = path.join(distDir, "launcher.cjs");
const outputExePath = path.join(distDir, "SpellCheckAutomation.exe");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function cleanDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  ensureDir(dirPath);
}

function copyDirIfExists(from, to) {
  if (!fs.existsSync(from)) {
    return;
  }
  fs.cpSync(from, to, { recursive: true });
}

function run(command) {
  execSync(command, {
    stdio: "inherit",
    cwd: rootDir,
    env: process.env,
  });
}

function verifyBuildOutputs() {
  const standaloneDir = path.join(rootDir, ".next", "standalone");
  const standaloneServer = path.join(standaloneDir, "server.js");
  const staticDir = path.join(rootDir, ".next", "static");

  if (!fs.existsSync(standaloneDir) || !fs.existsSync(standaloneServer)) {
    throw new Error("Missing .next/standalone/server.js. Ensure Next standalone build succeeded.");
  }

  if (!fs.existsSync(staticDir)) {
    throw new Error("Missing .next/static output. Ensure Next build completed successfully.");
  }
}

function stageAppFiles() {
  const standaloneDir = path.join(rootDir, ".next", "standalone");
  const staticDir = path.join(rootDir, ".next", "static");
  const publicDir = path.join(rootDir, "public");

  copyDirIfExists(standaloneDir, appDir);
  ensureDir(path.join(appDir, ".next"));
  copyDirIfExists(staticDir, path.join(appDir, ".next", "static"));
  copyDirIfExists(publicDir, path.join(appDir, "public"));
}

function writeLauncher() {
  const launcherSource = `const path = require("node:path");

const appRoot = path.join(__dirname, "app");
process.chdir(appRoot);

process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
process.env.PORT = process.env.PORT || "3000";

require("./app/server.js");
`;

  fs.writeFileSync(launcherPath, launcherSource, "utf8");
}

function buildExe() {
  const pkgCommand = [
    "npx",
    "pkg",
    `\"${launcherPath}\"`,
    "--targets",
    "node18-win-x64",
    "--output",
    `\"${outputExePath}\"`,
  ].join(" ");

  run(pkgCommand);
}

function main() {
  cleanDir(distDir);
  run("npm run build");
  verifyBuildOutputs();
  stageAppFiles();
  writeLauncher();
  buildExe();

  console.log("\nWindows package created:");
  console.log(`- EXE: ${outputExePath}`);
  console.log(`- App files: ${appDir}`);
  console.log("\nRun SpellCheckAutomation.exe from dist/windows/ and keep the app/ folder beside it.");
}

main();
