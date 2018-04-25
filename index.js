'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const semver = require('semver');

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

const results = crawl([{ name: 'react' }]);
fs.writeFileSync('./report.json', JSON.stringify(results, null, '\t'));
