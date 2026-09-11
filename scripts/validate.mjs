#!/usr/bin/env node
// Validates every services/<name>/service.yaml against schema/service.schema.json
// plus the cross-field rules the schema cannot express. Exit 1 on any problem.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { parse } from "yaml";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(readFileSync(join(root, "schema/service.schema.json"), "utf8"));
const ajv = new Ajv2020({ allErrors: true, strictRequired: false });
addFormats(ajv);
const validate = ajv.compile(schema);

const servicesDir = join(root, "services");
const problems = [];
const seenPayTo = new Map();

const dirs = readdirSync(servicesDir).filter((d) => !d.startsWith(".") && statSync(join(servicesDir, d)).isDirectory());
for (const dir of dirs) {
  const file = join(servicesDir, dir, "service.yaml");
  const where = `services/${dir}/service.yaml`;
  if (!existsSync(file)) {
    problems.push(`${where}: missing (every directory under services/ needs a manifest)`);
    continue;
  }
  let doc;
  try {
    doc = parse(readFileSync(file, "utf8"));
  } catch (err) {
    problems.push(`${where}: YAML parse error: ${err.message}`);
    continue;
  }
  if (!validate(doc)) {
    for (const e of validate.errors) {
      let msg = `${where}: ${e.instancePath || "/"} ${e.message}`;
      if (e.instancePath === "/pay_to" && typeof doc?.pay_to === "number") msg += ' (quote the address: bare 0x... is parsed as a YAML integer)';
      problems.push(msg);
    }
    continue;
  }
  if (doc.name !== dir) problems.push(`${where}: name "${doc.name}" must equal directory name "${dir}"`);
  if (!existsSync(join(servicesDir, dir, "README.md"))) problems.push(`${where}: services/${dir}/README.md is required`);
  const paths = new Set();
  for (const ep of doc.endpoints) {
    const key = `${ep.method} ${ep.path}`;
    if (paths.has(key)) problems.push(`${where}: duplicate endpoint ${key}`);
    paths.add(key);
    if (doc.status !== "draft" && !ep.example_request) {
      problems.push(`${where}: ${key} needs example_request once the service is deployed`);
    }
  }
  const prev = seenPayTo.get(doc.pay_to.toLowerCase());
  if (prev && prev !== dir) console.warn(`note: ${where} shares pay_to with services/${prev}`);
  seenPayTo.set(doc.pay_to.toLowerCase(), dir);
}

if (problems.length) {
  console.error(problems.map((p) => `✗ ${p}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${dirs.length} service manifest(s) valid`);
