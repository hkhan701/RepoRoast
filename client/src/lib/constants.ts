export const MAX_FILES_TO_RETURN = 7;
export const MAX_FILE_CONTENT_CHARS = 3000; // per file, ~750 tokens
export const MAX_README_CHARS = 2000;

// Directories and patterns to strip from the tree before anything else.
// Covers node_modules, build artifacts, lock files, media, etc.
export const NOISE_DIR_PREFIXES = [
  "node_modules/",
  ".git/",
  "dist/",
  "build/",
  ".next/",
  "out/",
  "__pycache__/",
  ".pytest_cache/",
  "venv/",
  ".venv/",
  "env/",
  ".env/",
  "vendor/",       // PHP / Go
  "target/",       // Rust / Java Maven
  ".gradle/",
  "Pods/",         // iOS CocoaPods
  "DerivedData/",
  ".dart_tool/",
  "coverage/",
  ".nyc_output/",
  "storybook-static/",
  ".turbo/",
  ".cache/",
  "tmp/",
  "temp/",
];

export const NOISE_FILE_EXTENSIONS = new Set([
  // Lock files
  "lock", "sum",
  // Media
  "png", "jpg", "jpeg", "gif", "svg", "ico", "webp", "avif",
  "mp4", "mp3", "wav", "ogg", "mov", "avi",
  "ttf", "woff", "woff2", "eot", "otf",
  // Compiled / binary
  "pyc", "pyo", "class", "jar", "war", "dll", "so", "dylib", "exe",
  "min.js", "min.css",
  // Data dumps
  "csv", "sql", "db", "sqlite", "sqlite3",
  // Docs that aren't READMEs
  "pdf", "docx", "xlsx", "pptx",
]);

export const NOISE_EXACT_FILES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Gemfile.lock",
  "Cargo.lock",
  "poetry.lock",
  "composer.lock",
  "go.sum",
  ".DS_Store",
  "Thumbs.db",
]);

export const REPO_ROAST_SERVER_URL = (
  process.env.NEXT_PUBLIC_REPO_ROAST_SERVER_URL ?? "http://localhost:5000"
).replace(/\/$/, "");

