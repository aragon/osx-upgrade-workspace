#!/usr/bin/env -S deno run

type Action = {
  to: string;
  value: number;
  data: string;
};

async function main() {
  if (Deno.args.length !== 1) {
    console.error("Usage: deno run script.ts <file>.json");
    Deno.exit(1);
  }

  const filename = Deno.args[0];
  let fileContent: string;

  try {
    fileContent = await Deno.readTextFile(filename);
  } catch (error) {
    console.error(`Error reading file "${filename}": ${error.message}`);
    Deno.exit(1);
  }

  const actions = parseActions(fileContent!);
  console.log(JSON.stringify(actions, null, 2));
}

function parseActions(strData: string) {
  const data = JSON.parse(strData);
  if (!Array.isArray(data) || data.length !== 5) {
    throw new Error("Invalid proposal data");
  }

  return parseTupleString(data[3] as string);
}

function parseTupleString(input: string): Action[] {
  const result: Action[] = [];

  const tuples = input.slice(2, -2).split("), (");

  for (const tuple of tuples) {
    const values = tuple.split(", ");

    if (values.length !== 3) {
      throw new Error(`Invalid tuple contents: ${tuple}`);
    }

    result.push({
      to: values[0],
      value: parseInt(values[1]),
      data: values[2],
    });
  }

  return result;
}

if (import.meta.main) {
  await main();
}
