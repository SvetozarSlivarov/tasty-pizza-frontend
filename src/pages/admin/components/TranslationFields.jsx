import { LANGUAGE_LABELS as APP_LANGUAGE_LABELS, useLanguage } from "../../../context/LanguageContext";

export const SUPPORTED_LANGUAGES = ["en", "bg", "de", "fr"];

const LANGUAGE_LABELS = {
  en: "English",
  bg: "Bulgarian",
  de: "German",
  fr: "French",
};

export function emptyTranslations(fields = ["name", "description"]) {
  return SUPPORTED_LANGUAGES.reduce((acc, lang) => {
    acc[lang] = fields.reduce((fieldAcc, fieldName) => {
      fieldAcc[fieldName] = "";
      return fieldAcc;
    }, {});
    return acc;
  }, {});
}

export function hasAnyTranslatedValue(translations, fieldName) {
  return SUPPORTED_LANGUAGES.some((lang) => String(translations?.[lang]?.[fieldName] || "").trim());
}

export function firstLanguageWithContent(translations, fields = ["name", "description"]) {
  return SUPPORTED_LANGUAGES.find((lang) =>
    fields.some((fieldName) => String(translations?.[lang]?.[fieldName] || "").trim())
  ) || "en";
}

export function translationsToRequest(translations, fields = ["name", "description"]) {
  return fields.reduce((acc, fieldName) => {
    acc[fieldName] = SUPPORTED_LANGUAGES.reduce((fieldAcc, lang) => {
      fieldAcc[lang] = String(translations?.[lang]?.[fieldName] || "").trim();
      return fieldAcc;
    }, {});
    return acc;
  }, {});
}

export function translationsFromResponse(response, fields = ["name", "description"]) {
  const next = emptyTranslations(fields);
  const responseFields = response?.fields || {};

  for (const fieldName of fields) {
    const valuesByLanguage = responseFields[fieldName] || {};
    for (const lang of SUPPORTED_LANGUAGES) {
      next[lang][fieldName] = String(valuesByLanguage?.[lang]?.translatedText || "");
    }
  }

  return next;
}

export function mergePreviewTranslations(current, response, fields = ["name", "description"]) {
  const next = { ...current };
  const responseFields = response?.fields || {};

  for (const fieldName of fields) {
    const valuesByLanguage = responseFields[fieldName] || {};
    for (const lang of SUPPORTED_LANGUAGES) {
      const returnedValue = valuesByLanguage?.[lang]?.translatedText;
      if (returnedValue == null) continue;
      next[lang] = {
        ...next[lang],
        [fieldName]: returnedValue,
      };
    }
  }

  return next;
}

export default function TranslationFields({
  styles,
  translations,
  fields = ["name", "description"],
  disabled = false,
  translating = false,
  onChange,
  onGenerate,
}) {
  const { t } = useLanguage();

  return (
    <div className={styles.fieldFull}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitle}>{t("Translations")}</div>
        <button
          type="button"
          className={styles.btnSmall || styles.btn}
          onClick={onGenerate}
          disabled={disabled}
        >
          {translating ? t("Generating...") : t("Generate translations")}
        </button>
      </div>

      <div className={styles.grid2}>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <div className={styles.field} key={lang}>
            {fields.map((fieldName) => {
              const isDescription = fieldName === "description";
              const label = `${APP_LANGUAGE_LABELS[lang] || LANGUAGE_LABELS[lang]} ${t(fieldName)}`;
              return (
                <div key={fieldName}>
                  <label className={styles.label} style={fieldName === fields[0] ? undefined : { marginTop: 8 }}>
                    {label}
                  </label>
                  {isDescription ? (
                    <textarea
                      className={styles.textarea || styles.input}
                      value={translations[lang]?.[fieldName] || ""}
                      onChange={(e) => onChange(lang, fieldName, e.target.value)}
                      disabled={disabled}
                    />
                  ) : (
                    <input
                      className={styles.input}
                      value={translations[lang]?.[fieldName] || ""}
                      onChange={(e) => onChange(lang, fieldName, e.target.value)}
                      disabled={disabled}
                    />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
