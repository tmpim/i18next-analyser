const { promises: fs } = require("fs");
const path = require("path");

const langKeyExclude = /_(\d+|plural)$/;

async function readLanguage(localeDir, code, lang) {
  const translationFile = path.join(localeDir, code, "translation.json");
  const translation = JSON.parse((await fs.readFile(translationFile)).toString());

  const isObject = val =>
    typeof val === "object" && !Array.isArray(val);
  const addDelimiter = (a, b) =>
    a ? `${a}.${b}` : b;
  
  // Find all translation keys recursively
  const keys = (obj = {}, head = "") =>
    Object.entries(obj)
      .reduce((product, [key, value]) => {
        // Ignore plurals etc
        if (langKeyExclude.test(key)) return product;

        const fullPath = addDelimiter(head, key);
        return isObject(value)
          ? product.concat(keys(value, fullPath))
          : product.concat(fullPath)
      }, []);

  const allKeys = keys(translation);
  const keyCount = allKeys.length;

  return { code, lang, keyCount };
}

module.exports = async (baseLocale = "en", specPath, localeDir) => {
  const languagesJSON = JSON.parse((await fs.readFile(specPath)).toString());

  // Fetch all the languages and convert to object keyed by language code
  const languages = (await Promise.all(Object.entries(languagesJSON)
    .map(([code, lang]) => readLanguage(localeDir, code, lang))))
    .reduce((obj, lang) => ({ ...obj, [lang.code]: lang }), {});

  const rootKeys = languages[baseLocale].keyCount;
  for (const [, lang] of Object.entries(languages)) {
    lang.missing = rootKeys - lang.keyCount;
  }  

  return languages;
};