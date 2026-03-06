import fs from "node:fs";
import path from "node:path";
import { PDFParse } from "pdf-parse";

const [,, inputPathArg, outputPathArg] = process.argv;

if (!inputPathArg) {
  console.error("Usage: node scripts/extract-pdf-text.mjs <input.pdf> [output.txt]");
  process.exit(1);
}

const inputPath = path.resolve(process.cwd(), inputPathArg);
const outputPath = outputPathArg
  ? path.resolve(process.cwd(), outputPathArg)
  : inputPath.replace(/\.pdf$/i, "") + ".txt";

if (!fs.existsSync(inputPath)) {
  console.error(`Input PDF not found: ${inputPath}`);
  process.exit(1);
}

const dataBuffer = fs.readFileSync(inputPath);

const parser = new PDFParse({ data: dataBuffer });
const result = await parser.getText();
await parser.destroy();

const text = (result.text || "")
  .replace(/\r\n/g, "\n")
  .replace(/[\t\f\v]+/g, " ")
  .replace(/\u00A0/g, " ")
  .replace(/[ ]{2,}/g, " ")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, text + "\n", "utf8");

console.log(JSON.stringify({
  inputPath,
  outputPath,
  pages: result.total,
  chars: text.length,
}, null, 2));
