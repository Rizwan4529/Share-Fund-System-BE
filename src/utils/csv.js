/*
 * Minimal RFC 4180 CSV writer for admin exports.
 *
 * Text cells that start with = + - @ (or tab/CR) are prefixed with ' so
 * spreadsheet apps don't execute participant-entered text as a formula
 * (CSV injection). Numbers are written as-is.
 */

const FORMULA_START = /^[=+\-@\t\r]/;

export const toCsvCell = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * @param {{ header: string, value: (row) => unknown }[]} columns
 * @param {object[]} rows
 * @returns {string} CSV text with a UTF-8 BOM so Excel reads accents correctly
 */
export const toCsv = (columns, rows) =>
  "﻿" +
  [
    columns.map((column) => toCsvCell(column.header)).join(","),
    ...rows.map((row) => columns.map((column) => toCsvCell(column.value(row))).join(",")),
  ].join("\r\n");
