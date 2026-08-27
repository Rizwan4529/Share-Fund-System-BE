import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { EMAIL_ASSET_PATHS, EMAIL_BRAND } from "./constants.js";

const htmlDir = join(dirname(fileURLToPath(import.meta.url)), "../html");

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const interpolate = (template, vars) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] == null ? "" : String(vars[key]),
  );

const withTrailingSlash = (url) => {
  if (!url) return "";
  return url.endsWith("/") ? url : `${url}/`;
};

const getFrontendBaseUrl = () =>
  withTrailingSlash(process.env.FRONTEND_BASE_URL || "");

const resolveAssetUrl = (envValue, relativePath) => {
  if (envValue) return envValue;
  const base = getFrontendBaseUrl();
  return base ? `${base}${relativePath}` : "";
};

export const getEmailAssets = () => ({
  logoUrl: resolveAssetUrl(process.env.EMAIL_LOGO_URL, EMAIL_ASSET_PATHS.LOGO),
  worldWhiteUrl: resolveAssetUrl(
    process.env.EMAIL_WORLD_WHITE_URL,
    EMAIL_ASSET_PATHS.WORLD_WHITE,
  ),
  mailIconUrl: process.env.EMAIL_MAIL_ICON_URL || "",
});

const flattenBrand = () => {
  const colors = {};
  for (const [key, value] of Object.entries(EMAIL_BRAND.COLORS)) {
    const camel = key
      .toLowerCase()
      .replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    colors[`color${camel[0].toUpperCase()}${camel.slice(1)}`] = value;
  }
  return {
    ...colors,
    brandName: EMAIL_BRAND.NAME,
    brandShortName: EMAIL_BRAND.SHORT_NAME,
    fontDisplay: EMAIL_BRAND.FONTS.DISPLAY,
    fontBody: EMAIL_BRAND.FONTS.BODY,
    frontendBaseUrl: getFrontendBaseUrl(),
    year: String(new Date().getFullYear()),
  };
};

const mailIconInner = (mailIconUrl, colorNavyDeep) => {
  if (mailIconUrl) {
    return `<img src="${escapeHtml(mailIconUrl)}" width="36" height="36" alt="" style="display:block;margin:0 auto;border:0;outline:none;" />`;
  }
  return `<span style="display:inline-block;font-size:32px;line-height:82px;color:${colorNavyDeep};">&#9993;</span>`;
};

const loadHtml = (fileName) =>
  readFileSync(join(htmlDir, `${fileName}.html`), "utf8");

export const renderEmailTemplate = (templateName, vars = {}) => {
  const assets = getEmailAssets();
  const brand = flattenBrand();
  const layout = loadHtml("layout");
  const inner = loadHtml(templateName);
  const html = layout.replace("{{content}}", () => inner);

  return interpolate(html, {
    ...brand,
    ...assets,
    mailIconInner: mailIconInner(assets.mailIconUrl, brand.colorNavyDeep),
    firstName: escapeHtml(vars.firstName || "there"),
    email: escapeHtml(vars.email || ""),
    verifyUrl: escapeHtml(vars.verifyUrl || ""),
    preheader: escapeHtml(vars.preheader || ""),
  });
};
