'use strict';

const { spawnSync } = require('child_process');
const program = require('commander');
const fs = require('fs');
const semver = require('semver');

program
  .version('1.0.0')
  .option('-p --package [value]', 'Package name')
  .option('-f --filepath [value]', 'package.json file path')
  .option('-o --output [value]', 'reports\' file path')
  .parse(process.argv);

console.log(program.package, program.filepath)
if (!program.package && !program.filepath) {
  console.warn('Neither package name nor package.json file path sepecified, exit :(')
  process.exit();
}
const OUTPUT_PATH = program.output || './report.json';

function parseRepo(name, version) {
  console.log(`parsing ${name}`);
  const paras = ['view', `${name}${version ? `@${version}` : ''}`, '--json'];
  const repoMeta = spawnSync('npm', paras);
  if (repoMeta.stderr.toString()) throw repoMeta.stderr;

  const parsedObj = JSON.parse(repoMeta.stdout.toString().trim());
  if (Array.isArray(parsedObj)) {
    // Returns the metadata of latest package in the parsed result
    // For example query ^1.0.0 returns meta objects with version 1.0.1, 1.0.2, 1.1.1, 1.2.1,
    //  1.2.1 is the most interested one
    return parsedObj.sort(
      (a, b) => semver.gt(a.version, b.version) ? -1 : 1
    )[0];
  }
  return parsedObj;
}

function crawl(packages) {
  const visitedPacDict = packages.reduce((acc, d) => { acc[d.name] = true; return acc }, {});
  const queue = packages;
  const results = [];
  while (queue.length) {
    const item = queue.pop();
    const repoMeta = parseRepo(item.name, item.version);
    if (repoMeta.dependencies) {
      for (let dep in repoMeta.dependencies) {
        if (visitedPacDict[dep]) continue;
        visitedPacDict[dep] = true;
        queue.push({ name: dep, version: dep.version });
      }
    }

    const result = {
      name: item.name,
      version: repoMeta.version,
      homepage: repoMeta.homepage
    };
    if (repoMeta.dependencies) {
      result.deps = Object.keys(repoMeta.dependencies);
    }
    results.push(result);
  }
  return results;
}

if (program.package) {
  const results = crawl([{ name: program.package }]);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, '\t'));
} else {
  const appMeta = JSON.parse(fs.readFileSync(program.filepath));
  const targets = [];
  for (let dep in appMeta.dependencies) {
    targets.push({ name: dep, version: appMeta.dependencies[dep] });
  }
  const app = { name: appMeta.name, deps: targets.map(d => d.name) };
  const results = crawl(targets);
  results.push(app);

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, '\t'));
}
