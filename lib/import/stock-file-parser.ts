import JSZip from "jszip";

type ParsedTable = {
  headers: string[];
  rows: Record<string, string>[];
};

export type ParsedVehicleRow = {
  make: string;
  engineCapacity: string;
  bikeCategory: string;
  sourceModel: string;
  engineNumber: string;
  chassisNumber: string;
  color: string;
  yom: string;
  version: string;
};

export type ParsedSpareRow = {
  sourceModel: string;
  sourceSpare: string;
  serialNumber: string;
  price?: number;
};

const ALLOWED_EXTENSIONS = [".pdf", ".xlsx", ".tsv", ".ods"];

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function normalizeMatchValue(value: string | null | undefined) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getValue(row: Record<string, string>, aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeHeader);
  const match = Object.entries(row).find(([key]) =>
    normalizedAliases.includes(normalizeHeader(key))
  );
  return match?.[1]?.trim() ?? "";
}

function columnIndex(cellRef: string) {
  const letters = cellRef.replace(/[0-9]/g, "");
  return letters.split("").reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function parseSharedStrings(xml: string) {
  return Array.from(xml.matchAll(/<si[\s\S]*?<\/si>/g)).map((match) => {
    const textParts = Array.from(match[0].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)).map((text) =>
      decodeXml(text[1])
    );
    return textParts.join("");
  });
}

function parseXlsxRows(buffer: ArrayBuffer) {
  return JSZip.loadAsync(buffer).then(async (zip) => {
    const sharedXml = await zip.file("xl/sharedStrings.xml")?.async("text");
    const sharedStrings = sharedXml ? parseSharedStrings(sharedXml) : [];
    const sheetPath =
      Object.keys(zip.files).find((path) => /^xl\/worksheets\/sheet\d+\.xml$/.test(path)) ??
      "xl/worksheets/sheet1.xml";
    const sheetXml = await zip.file(sheetPath)?.async("text");

    if (!sheetXml) throw new Error("No worksheet found in XLSX file");

    return Array.from(sheetXml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)).map((rowMatch) => {
      const values: string[] = [];
      for (const cellMatch of rowMatch[1].matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
        const attrs = cellMatch[1];
        const body = cellMatch[2];
        const ref = attrs.match(/\sr="([^"]+)"/)?.[1] ?? "";
        const type = attrs.match(/\st="([^"]+)"/)?.[1] ?? "";
        const index = ref ? columnIndex(ref) : values.length;
        const raw = body.match(/<v[^>]*>([\s\S]*?)<\/v>/)?.[1] ?? "";
        const inline = body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? "";
        values[index] = type === "s" ? sharedStrings[Number(raw)] ?? "" : decodeXml(inline || raw);
      }
      return values;
    });
  });
}

function parseOdsRows(buffer: ArrayBuffer) {
  return JSZip.loadAsync(buffer).then(async (zip) => {
    const contentXml = await zip.file("content.xml")?.async("text");
    if (!contentXml) throw new Error("No content.xml found in ODS file");

    const table = contentXml.match(/<table:table[\s\S]*?<\/table:table>/)?.[0] ?? contentXml;
    return Array.from(table.matchAll(/<table:table-row[^>]*>([\s\S]*?)<\/table:table-row>/g)).map((rowMatch) => {
      const values: string[] = [];
      for (const cellMatch of rowMatch[1].matchAll(/<table:table-cell([^>]*)>([\s\S]*?)<\/table:table-cell>/g)) {
        const repeat = Number(cellMatch[1].match(/table:number-columns-repeated="(\d+)"/)?.[1] ?? 1);
        const text = Array.from(cellMatch[2].matchAll(/<text:p[^>]*>([\s\S]*?)<\/text:p>/g))
          .map((part) => decodeXml(part[1].replace(/<[^>]+>/g, "")))
          .join(" ");
        for (let index = 0; index < repeat; index += 1) values.push(text);
      }
      return values;
    });
  });
}

function parseTsvRows(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.split("\t").map((value) => value.trim()))
    .filter((row) => row.some(Boolean));
}

function parsePdfTextRows(buffer: ArrayBuffer) {
  const raw = Buffer.from(buffer).toString("latin1");
  const strings = Array.from(raw.matchAll(/\(([^()]*)\)/g))
    .map((match) => match[1].replace(/\\([nrtbf()\\])/g, "$1").trim())
    .filter(Boolean);
  const text = strings.join("\n");

  return text
    .split(/\r?\n/)
    .map((line) => line.split(/\t| {2,}/).map((value) => value.trim()))
    .filter((row) => row.length > 1 && row.some(Boolean));
}

function tableFromRows(rawRows: string[][]): ParsedTable {
  const rows = rawRows.filter((row) => row.some((value) => String(value ?? "").trim()));
  const headerIndex = rows.findIndex((row) =>
    row.some((cell) => ["model", "modelname", "modelcode"].includes(normalizeHeader(String(cell))))
  );

  if (headerIndex === -1) {
    throw new Error("Could not find a header row with a Model column");
  }

  const headers = rows[headerIndex].map((header) => String(header ?? "").trim());
  const dataRows = rows.slice(headerIndex + 1).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header || `Column ${index + 1}`, String(row[index] ?? "").trim()]))
  );

  return { headers, rows: dataRows };
}

export async function parseStockFile(file: File): Promise<ParsedTable> {
  const lowerName = file.name.toLowerCase();
  const extension = ALLOWED_EXTENSIONS.find((item) => lowerName.endsWith(item));

  if (!extension) {
    throw new Error("Only PDF, XLSX, TSV, and ODS files are allowed");
  }

  const buffer = await file.arrayBuffer();

  if (extension === ".xlsx") return tableFromRows(await parseXlsxRows(buffer));
  if (extension === ".ods") return tableFromRows(await parseOdsRows(buffer));
  if (extension === ".tsv") return tableFromRows(parseTsvRows(await file.text()));

  return tableFromRows(parsePdfTextRows(buffer));
}

export function toVehicleRows(table: ParsedTable): ParsedVehicleRow[] {
  return table.rows
    .map((row) => {
      // Try multiple variations of chassis number headers
      let chassisNumber = getValue(row, ["Chasis Number", "Chassis Number", "Chassis", "Chasis no"]);
      
      // If chassis number is empty, try to find it by index or other variations
      if (!chassisNumber) {
        // Look for any column that contains "chassis" or "chasis" in the header
        const chassisKey = Object.keys(row).find(key => 
          key.toLowerCase().includes('chassis') || key.toLowerCase().includes('chasis')
        );
        if (chassisKey) chassisNumber = row[chassisKey];
      }
      
      let engineNumber = getValue(row, ["Engine Number", "Engine", "Engine no"]);
      if (!engineNumber) {
        const engineKey = Object.keys(row).find(key => 
          key.toLowerCase().includes('engine')
        );
        if (engineKey) engineNumber = row[engineKey];
      }
      
      return {
        make: getValue(row, ["Make", "Manufacture", "MadeBy", "Company"]),
        engineCapacity: getValue(row, ["Engine capacity", "CC", "Engine CC"]),
        bikeCategory: getValue(row, ["Bike Category", "Category", "Type"]),
        sourceModel: getValue(row, ["Model", "Model Name", "Model Code"]),
        engineNumber: engineNumber,
        chassisNumber: chassisNumber,
        color: getValue(row, ["Color", "Colour"]),
        yom: getValue(row, ["YOM", "Year", "Year of Manufacture"]),
        version: getValue(row, ["Description", "Version", "Variant"]),
      };
    })
    .filter((row) => row.sourceModel || row.engineNumber || row.chassisNumber);
}

export function toSpareRows(table: ParsedTable): ParsedSpareRow[] {
  return table.rows
    .map((row) => {
      const priceStr = getValue(row, ["Price", "Unit Price", "Cost", "Amount"]);
      const price = priceStr ? Number(priceStr.replace(/[^0-9.]/g, "")) : undefined;
      return {
        sourceModel: getValue(row, ["Model", "Model Name", "Model Code"]),
        sourceSpare: getValue(row, ["Spare", "Spare Name", "Spare Code", "Part", "Part Name"]),
        serialNumber: getValue(row, ["Serial Number", "Serial", "Serial No", "Serial_no"]),
        price: price && !isNaN(price) ? price : undefined,
      };
    })
    .filter((row) => row.sourceModel || row.sourceSpare || row.serialNumber);
}
