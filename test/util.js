'use strict';

const path = require('path');
const del = require('del');
const makeDir = require('make-dir');
const parentModule = require('parent-module');
const os = require('os');
const fs = require.requireActual('fs');

// Extract and return file paths from the spy calls. The filepaths returned
// are relative to the given directory. They are also normalized to be
// consistent across platforms.
function getSpyPathCalls(dir, spy) {
  const calls = spy.mock.calls;

  const result = calls.map(call => {
    const filePath = call[0];
    const relativePath = path.relative(dir, filePath);

    /**
     * Replace Windows backslash directory separators with forward slashes
     * so expected paths will be consistent cross platform
     */
    const normalized = relativePath.replace(/\\/g, '/');
    return normalized;
  });

  return result;
}

class TempDir {
  dir: string;

  constructor() {
    /**
     * Get the actual path for temp directories that are symlinks (MacOS).
     * Without the actual path, tests that use process.chdir will unexpectedly
     * return the real path instead of symlink path.
     */
    const tempDir = fs.realpathSync(os.tmpdir());
    /**
     * Get the pathname of the file that imported util.js.
     * Used to create a unique directory name for each test suite.
     */
    const parent = parentModule();
    const relativeParent = path.relative(process.cwd(), parent);

    /**
     * Each temp directory will be unique to the test file.
     * This ensures that temp files/dirs won't cause side effects for other tests.
     */
    this.dir = path.resolve(tempDir, 'cosmiconfig', `${relativeParent}-dir`);

    // create directory
    makeDir.sync(this.dir);

    (this: any).absolutePath = this.absolutePath.bind(this);
    (this: any).createDir = this.createDir.bind(this);
    (this: any).createFile = this.createFile.bind(this);
    (this: any).clean = this.clean.bind(this);
    (this: any).deleteTempDir = this.deleteTempDir.bind(this);
  }

  absolutePath(dir: string) {
    // Use path.join to ensure dir is always inside the working temp directory
    const absolutePath = path.join(this.dir, dir);

    return absolutePath;
  }

  createDir(dir: string) {
    const dirname = this.absolutePath(dir);
    makeDir.sync(dirname);
  }

  createFile(file: string, contents: string) {
    const filePath = this.absolutePath(file);
    const fileDir = path.parse(filePath).dir;
    makeDir.sync(fileDir);

    fs.writeFileSync(filePath, `${contents}\n`);
  }

  clean() {
    const cleanPattern = this.absolutePath('**/*');
    const removed = del.sync(cleanPattern, {
      dot: true,
      force: true,
    });

    return removed;
  }

  deleteTempDir() {
    const removed = del.sync(this.dir, { force: true, dot: true });

    return removed;
  }
}

module.exports = {
  TempDir,
  getSpyPathCalls,
};
