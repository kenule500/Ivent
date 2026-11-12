import { v } from "convex/values";

/**
 * Shared validators and limits for the event-platform-expansion feature.
 *
 * Keeping these in one module means the schema, mutations, and UI-facing
 * constants cannot drift apart. Every limit here is also enforced server-side
 * in the mutation that accepts the value.
 */

export const SUPPORTED_LOCALES = ["en", "fr"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const SUPPORTED_CURRENCIES = ["NGN", "USD", "GBP", "EUR"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const MAX_SPONSORS = 6;
export const MAX_SPONSOR_LOGO_BYTES = 2 * 1024 * 1024;
export const SPONSOR_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const MAX_REGISTRATION_QUESTIONS = 10;
export const MAX_QUESTION_LABEL = 120;
export const MAX_QUESTION_HELP = 200;
export const MAX_QUESTION_OPTION = 80;
export const MAX_QUESTION_OPTIONS = 20;
export const MAX_ANSWER_LENGTH = 500;
export const MAX_OFFLINE_CHECKINS = 500;

export const localeValidator = v.union(
  v.literal("en"),
  v.literal("fr")
);

export const currencyValidator = v.union(
  v.literal("NGN"),
  v.literal("USD"),
  v.literal("GBP"),
  v.literal("EUR")
);

export const questionTypeValidator = v.union(
  v.literal("short_text"),
  v.literal("long_text"),
  v.literal("single_select"),
  v.literal("multi_select"),
  v.literal("number"),
  v.literal("date")
);

export type QuestionType =
  | "short_text"
  | "long_text"
  | "single_select"
  | "multi_select"
  | "number"
  | "date";

export const sponsorValidator = v.object({
  id: v.string(),
  name: v.string(),
  logoStorageId: v.string(),
  websiteUrl: v.optional(v.string()),
  order: v.number(),
});

export const questionDefinitionValidator = v.object({
  id: v.string(),
  label: v.string(),
  type: questionTypeValidator,
  required: v.boolean(),
  helpText: v.optional(v.string()),
  options: v.optional(v.array(v.string())),
  archived: v.optional(v.boolean()),
  version: v.optional(v.number()),
});

export const registrationAnswerValidator = v.object({
  questionId: v.string(),
  value: v.union(v.string(), v.number(), v.array(v.string())),
});

export const walletValidator = v.object({
  provider: v.literal("google"),
  objectId: v.string(),
  status: v.union(
    v.literal("active"),
    v.literal("voided"),
    v.literal("error")
  ),
  issuedAt: v.number(),
  updatedAt: v.number(),
  lastError: v.optional(v.string()),
});

export const offlineCheckInValidator = v.object({
  qrCode: v.string(),
  scannedAt: v.number(),
});

export function normalizeLocale(value: unknown): SupportedLocale {
  return value === "fr" ? "fr" : "en";
}

export function normalizeCurrency(value: unknown): SupportedCurrency {
  const upper = typeof value === "string" ? value.trim().toUpperCase() : "";
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(upper)
    ? (upper as SupportedCurrency)
    : "USD";
}

export function isValidCurrency(value: unknown): value is SupportedCurrency {
  return (
    typeof value === "string" &&
    (SUPPORTED_CURRENCIES as readonly string[]).includes(value.toUpperCase())
  );
}

export function isValidLocale(value: unknown): value is SupportedLocale {
  return value === "en" || value === "fr";
}

/** Basic URL validation without accepting javascript: or data: links. */
export function safeWebsiteUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

/**
 * Validate a sponsor array and its ordering. Storage metadata checks are done
 * asynchronously by the mutation because they need the Convex storage context.
 */
export function validateSponsorArray(
  sponsors: Array<{
    id: string;
    name: string;
    logoStorageId: string;
    websiteUrl?: string;
    order: number;
  }>
) {
  if (sponsors.length > MAX_SPONSORS) {
    throw new Error(`An event can list at most ${MAX_SPONSORS} sponsors.`);
  }

  const ids = new Set<string>();
  const order = new Set<number>();

  for (const sponsor of sponsors) {
    const id = sponsor.id.trim();
    const name = sponsor.name.trim();
    const logoStorageId = sponsor.logoStorageId.trim();

    if (!id) throw new Error("Each sponsor needs an id.");
    if (ids.has(id)) throw new Error("Sponsor ids must be unique.");
    ids.add(id);

    if (!name) throw new Error("Each sponsor needs a name.");
    if (name.length > 120) {
      throw new Error("Sponsor names must be 120 characters or fewer.");
    }

    if (!logoStorageId) {
      throw new Error(`Sponsor "${name}" needs a logo.`);
    }

    if (!Number.isInteger(sponsor.order) || sponsor.order < 0) {
      throw new Error("Sponsor order must be a non-negative integer.");
    }
    if (order.has(sponsor.order)) {
      throw new Error("Sponsor order values must be unique.");
    }
    order.add(sponsor.order);
  }

  return sponsors.map((sponsor) => ({
    ...sponsor,
    id: sponsor.id.trim(),
    name: sponsor.name.trim(),
    logoStorageId: sponsor.logoStorageId.trim(),
    websiteUrl: safeWebsiteUrl(sponsor.websiteUrl),
  }));
}

/**
 * Validate the question definition array. This covers structural rules only;
 * answers are validated against a snapshot of these definitions at registration
 * time.
 */
export function validateQuestionArray(
  questions: Array<{
    id: string;
    label: string;
    type: QuestionType;
    required: boolean;
    helpText?: string;
    options?: string[];
    archived?: boolean;
    version?: number;
  }>
) {
  const active = questions.filter((question) => question.archived !== true);
  if (active.length > MAX_REGISTRATION_QUESTIONS) {
    throw new Error(
      `An event can have at most ${MAX_REGISTRATION_QUESTIONS} active registration questions.`
    );
  }

  const ids = new Set<string>();
  const labels = new Set<string>();

  for (const question of questions) {
    const id = question.id.trim();
    const label = question.label.trim();

    if (!id) throw new Error("Each question needs an id.");
    if (ids.has(id)) throw new Error("Question ids must be unique.");
    ids.add(id);

    if (!label) throw new Error("Each question needs a label.");
    if (label.length > MAX_QUESTION_LABEL) {
      throw new Error(
        `Question labels must be ${MAX_QUESTION_LABEL} characters or fewer.`
      );
    }

    if (question.archived !== true) {
      const key = label.toLocaleLowerCase();
      if (labels.has(key)) {
        throw new Error("Active question labels must be unique.");
      }
      labels.add(key);
    }

    if (
      question.helpText &&
      question.helpText.trim().length > MAX_QUESTION_HELP
    ) {
      throw new Error(
        `Question help text must be ${MAX_QUESTION_HELP} characters or fewer.`
      );
    }

    const needsOptions =
      question.type === "single_select" || question.type === "multi_select";

    if (needsOptions) {
      const options = (question.options ?? [])
        .map((option) => option.trim())
        .filter(Boolean);

      if (options.length < 2) {
        throw new Error(`Question "${label}" needs at least two options.`);
      }
      if (options.length > MAX_QUESTION_OPTIONS) {
        throw new Error(
          `Question "${label}" can have at most ${MAX_QUESTION_OPTIONS} options.`
        );
      }
      if (new Set(options).size !== options.length) {
        throw new Error(`Question "${label}" has duplicate options.`);
      }
      if (options.some((option) => option.length > MAX_QUESTION_OPTION)) {
        throw new Error(
          `Question options must be ${MAX_QUESTION_OPTION} characters or fewer.`
        );
      }
    } else if (question.options && question.options.length > 0) {
      throw new Error(`Question "${label}" does not accept options.`);
    }
  }

  return questions.map((question) => ({
    ...question,
    id: question.id.trim(),
    label: question.label.trim(),
    helpText: question.helpText?.trim() || undefined,
    options: question.options
      ?.map((option) => option.trim())
      .filter(Boolean),
    version: question.version ?? 1,
  }));
}

/**
 * Validate submitted answers and reject unknown, archived, or malformed values.
 */
export function validateAnswers(
  questions: Array<{
    id: string;
    label: string;
    type: QuestionType;
    required: boolean;
    helpText?: string;
    options?: string[];
    archived?: boolean;
    version?: number;
  }>,
  answers:
    | Array<{
        questionId: string;
        value: string | number | string[];
      }>
    | undefined
) {
  const active = questions.filter((question) => question.archived !== true);
  const byId = new Map(active.map((question) => [question.id, question]));
  const submitted = new Map<string, string | number | string[]>();

  for (const answer of answers ?? []) {
    if (!byId.has(answer.questionId)) {
      throw new Error("An answer refers to a question that no longer exists.");
    }
    if (submitted.has(answer.questionId)) {
      throw new Error("A question was answered more than once.");
    }
    submitted.set(answer.questionId, answer.value);
  }

  for (const question of active) {
    const value = submitted.get(question.id);

    if (question.required) {
      const empty =
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim().length === 0) ||
        (Array.isArray(value) && value.length === 0);

      if (empty) {
        throw new Error(`"${question.label}" is required.`);
      }
    }

    if (value === undefined) continue;

    switch (question.type) {
      case "short_text":
      case "long_text":
        if (typeof value !== "string") {
          throw new Error(`"${question.label}" must be text.`);
        }
        if (value.length > MAX_ANSWER_LENGTH) {
          throw new Error(
            `"${question.label}" must be ${MAX_ANSWER_LENGTH} characters or fewer.`
          );
        }
        break;
      case "number":
        if (typeof value !== "number" || !Number.isFinite(value)) {
          throw new Error(`"${question.label}" must be a number.`);
        }
        break;
      case "date":
        if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
          throw new Error(`"${question.label}" must be a valid date.`);
        }
        break;
      case "single_select":
        if (typeof value !== "string" || !(question.options ?? []).includes(value)) {
          throw new Error(`Choose a valid option for "${question.label}".`);
        }
        break;
      case "multi_select":
        if (
          !Array.isArray(value) ||
          value.some(
            (item) =>
              typeof item !== "string" ||
              !(question.options ?? []).includes(item)
          )
        ) {
          throw new Error(`Choose valid options for "${question.label}".`);
        }
        break;
    }
  }

  return active.map((question) => ({
    questionId: question.id,
    value: submitted.get(question.id) ?? "",
  }));
}
