/**
 * Input Sanitizer - Fonctions de sanitization et validation de sécurité
 * Protection contre XSS, SQL Injection et manipulation de données
 */

// Patterns courants d'injection SQL à détecter
const SQL_INJECTION_PATTERNS = [
  // Commentaires SQL
  /(\-\-|\#|\/\*|\*\/)/i,
  // Opérateurs logiques dangereux
  /(\b(OR|AND)\b\s*\d+\s*[=<>])/i,
  // UNION SELECT
  /\b(UNION\s+SELECT|SELECT\s+.*\s+FROM)\b/i,
  // INSERT/UPDATE/DELETE/ DROP
  /\b(INSERT\s+INTO|UPDATE\s+.*\s+SET|DELETE\s+FROM|DROP\s+TABLE)\b/i,
  // Fonctions dangereuses
  /\b(EXEC|EXECUTE|xp_|sp_)/i,
  // Quotes multiples ou échappement
  /(['";])\s*\1/i,
  // Conditions toujours vraies
  /(\d+\s*=\s*\d+|'[^']*'\s*=\s*'[^']*')/i,
];

// Tags HTML autorisés pour le sanitization léger
const ALLOWED_HTML_TAGS = [
  "b", "i", "em", "strong", "u", "br", "p", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6", "span", "div"
];

// Attributs HTML autorisés
const ALLOWED_HTML_ATTRIBUTES = ["class", "id", "style"];

// Caractères spéciaux HTML à échapper
const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
  "=": "&#x3D;",
};

export interface SanitizeOptions {
  /** Autoriser certains tags HTML (défaut: aucun) */
  allowedTags?: string[];
  /** Autoriser certains attributs (défaut: class, id) */
  allowedAttributes?: string[];
  /** Supprimer complètement les tags non autorisés au lieu de les échapper */
  stripDisallowed?: boolean;
  /** Conserver les sauts de ligne comme <br> */
  preserveNewlines?: boolean;
  /** Longueur max du résultat */
  maxLength?: number;
}

export interface ValidationResult {
  valid: boolean;
  sanitized?: string;
  error?: string;
  detectedPatterns?: string[];
}

/**
 * Échappe les caractères HTML spéciaux
 */
export function escapeHtml(input: string): string {
  if (typeof input !== "string") return "";
  
  return input.replace(/[&<>"'`=/]/g, (char) => HTML_ESCAPE_MAP[char] || char);
}

/**
 * Supprime tous les tags HTML
 */
export function stripHtml(input: string): string {
  if (typeof input !== "string") return "";
  
  // Supprimer les tags HTML
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize HTML en autorisant certains tags et attributs
 */
export function sanitizeHtml(
  input: string,
  options: SanitizeOptions = {}
): string {
  if (typeof input !== "string") return "";

  const {
    allowedTags = [],
    allowedAttributes = [],
    stripDisallowed = true,
    preserveNewlines = false,
    maxLength,
  } = options;

  let sanitized = input;

  // Préserver les sauts de ligne temporairement
  if (preserveNewlines) {
    sanitized = sanitized.replace(/\n/g, "{{NEWLINE}}");
  }

  // Parser et nettoyer les tags
  sanitized = sanitized.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g, (match, tagName) => {
    const lowerTagName = tagName.toLowerCase();

    // Tag autorisé
    if (allowedTags.includes(lowerTagName)) {
      // Extraire les attributs autorisés
      const attributes: string[] = [];
      const attrRegex = /(\w+)=(["'])([^"']*)\2/g;
      let attrMatch;

      while ((attrMatch = attrRegex.exec(match)) !== null) {
        const [, attrName, , attrValue] = attrMatch;
        if (allowedAttributes.includes(attrName.toLowerCase())) {
          // Sanitizer la valeur de l'attribut
          const safeValue = escapeHtml(attrValue);
          attributes.push(`${attrName}="${safeValue}"`);
        }
      }

      const isClosing = match.startsWith("</");
      if (isClosing) {
        return `</${lowerTagName}>`;
      }

      return attributes.length > 0
        ? `<${lowerTagName} ${attributes.join(" ")}>`
        : `<${lowerTagName}>`;
    }

    // Tag non autorisé
    return stripDisallowed ? "" : escapeHtml(match);
  });

  // Restaurer les sauts de ligne
  if (preserveNewlines) {
    sanitized = sanitized.replace(/\{\{NEWLINE\}\}/g, "<br>");
  }

  // Tronquer si nécessaire
  if (maxLength && sanitized.length > maxLength) {
    sanitized = truncateWithEllipsis(sanitized, maxLength);
  }

  return sanitized;
}

/**
 * Sanitize HTML simple - autorise le formatage de base
 */
export function sanitizeHtmlBasic(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ["b", "i", "em", "strong", "u", "br", "p"],
    allowedAttributes: [],
    stripDisallowed: true,
    preserveNewlines: true,
  });
}

/**
 * Sanitize HTML complet - autorise plus de tags
 */
export function sanitizeHtmlExtended(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: ALLOWED_HTML_TAGS,
    allowedAttributes: ALLOWED_HTML_ATTRIBUTES,
    stripDisallowed: true,
    preserveNewlines: true,
  });
}

/**
 * Détecte les patterns d'injection SQL
 */
export function detectSqlInjection(input: string): ValidationResult {
  if (typeof input !== "string") {
    return { valid: true, sanitized: "" };
  }

  const detectedPatterns: string[] = [];

  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      detectedPatterns.push(pattern.source);
    }
  }

  if (detectedPatterns.length > 0) {
    return {
      valid: false,
      error: "Potentielle injection SQL détectée",
      detectedPatterns,
    };
  }

  return {
    valid: true,
    sanitized: input,
  };
}

/**
 * Sanitize une entrée pour une requête SQL (échappement de base)
 * Note: Préférer les requêtes paramétrées côté serveur
 */
export function sanitizeForSql(input: string): string {
  if (typeof input !== "string") return "";

  // Échapper les quotes simples (doubler les quotes)
  return input.replace(/'/g, "''");
}

/**
 * Valide et sanitize une entrée SQL
 */
export function validateAndSanitizeSql(input: string): ValidationResult {
  const detection = detectSqlInjection(input);

  if (!detection.valid) {
    return detection;
  }

  return {
    valid: true,
    sanitized: sanitizeForSql(input),
  };
}

/**
 * Tronque une string avec ellipsis
 */
export function truncateWithEllipsis(
  input: string,
  maxLength: number,
  ellipsis: string = "..."
): string {
  if (typeof input !== "string") return "";
  if (maxLength <= 0) return "";
  if (input.length <= maxLength) return input;

  const availableLength = maxLength - ellipsis.length;
  if (availableLength <= 0) return ellipsis.slice(0, maxLength);

  return input.slice(0, availableLength) + ellipsis;
}

/**
 * Tronque au niveau d'un mot entier
 */
export function truncateAtWord(
  input: string,
  maxLength: number,
  ellipsis: string = "..."
): string {
  if (typeof input !== "string") return "";
  if (input.length <= maxLength) return input;

  const truncated = input.slice(0, maxLength - ellipsis.length);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > 0) {
    return truncated.slice(0, lastSpace) + ellipsis;
  }

  return truncated + ellipsis;
}

/**
 * Nettoie une string pour l'affichage (nom, description, etc.)
 */
export function cleanDisplayString(
  input: string,
  maxLength?: number
): string {
  if (typeof input !== "string") return "";

  // Supprimer les caractères de contrôle
  let cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // Normaliser les espaces multiples
  cleaned = cleaned.replace(/\s+/g, " ");

  // Trim
  cleaned = cleaned.trim();

  // Tronquer si nécessaire
  if (maxLength && cleaned.length > maxLength) {
    cleaned = truncateWithEllipsis(cleaned, maxLength);
  }

  return cleaned;
}

/**
 * Valide un email basique
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== "string") return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Sanitize un email
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== "string") return "";
  
  return email.toLowerCase().trim();
}

/**
 * Valide et sanitize un identifiant (alphanumérique + tirets/underscores)
 */
export function sanitizeIdentifier(input: string): string {
  if (typeof input !== "string") return "";
  
  // Garder seulement alphanumérique, tirets et underscores
  return input.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);
}

/**
 * Nettoie une URL pour éviter les attaques javascript:
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== "string") return "";
  
  const trimmed = url.trim().toLowerCase();
  
  // Bloquer les protocoles dangereux
  const dangerousProtocols = [
    "javascript:", "data:", "vbscript:", "file:", "about:", "blob:", "ftp:"
  ];
  
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return "";
    }
  }

  // Si c'est une URL relative, vérifier qu'elle ne contient pas de protocole caché
  if (trimmed.includes(":") && !trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return "";
  }

  return url.trim();
}

/**
 * Sanitize complet d'une entrée utilisateur
 * Combinaison de toutes les protections
 */
export function sanitizeUserInput(
  input: string,
  options: {
    allowHtml?: boolean;
    maxLength?: number;
    checkSql?: boolean;
    preserveNewlines?: boolean;
  } = {}
): ValidationResult {
  const { allowHtml = false, maxLength = 1000, checkSql = true, preserveNewlines = true } = options;

  if (typeof input !== "string") {
    return { valid: true, sanitized: "" };
  }

  // Vérifier SQL injection
  if (checkSql) {
    const sqlCheck = detectSqlInjection(input);
    if (!sqlCheck.valid) {
      return sqlCheck;
    }
  }

  let sanitized = input;

  // Sanitize HTML
  if (!allowHtml) {
    sanitized = stripHtml(sanitized);
  } else {
    sanitized = sanitizeHtmlBasic(sanitized);
  }

  // Nettoyer les caractères spéciaux
  sanitized = cleanDisplayString(sanitized);

  // Préserver les sauts de ligne si demandé
  if (preserveNewlines) {
    sanitized = sanitized.replace(/\n/g, "\\n");
  }

  // Tronquer
  if (maxLength > 0 && sanitized.length > maxLength) {
    sanitized = truncateWithEllipsis(sanitized, maxLength);
  }

  return {
    valid: true,
    sanitized,
  };
}

/**
 * Sanitize un objet entier récursivement
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  fieldsToSanitize: (keyof T)[]
): T {
  const result = { ...obj };

  for (const field of fieldsToSanitize) {
    if (typeof result[field] === "string") {
      (result as Record<string, string>)[field as string] = escapeHtml(result[field] as string);
    }
  }

  return result;
}

export default {
  escapeHtml,
  stripHtml,
  sanitizeHtml,
  sanitizeHtmlBasic,
  sanitizeHtmlExtended,
  detectSqlInjection,
  sanitizeForSql,
  validateAndSanitizeSql,
  truncateWithEllipsis,
  truncateAtWord,
  cleanDisplayString,
  isValidEmail,
  sanitizeEmail,
  sanitizeIdentifier,
  sanitizeUrl,
  sanitizeUserInput,
  sanitizeObject,
};
