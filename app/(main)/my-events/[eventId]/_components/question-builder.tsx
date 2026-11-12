"use client";

import { useMemo } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { QuestionType } from "@/convex/validators";
import { useI18n } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Registration question builder (BP-004).
 *
 * Deleting archives the definition instead of removing it, so answers already
 * collected remain exportable. Active questions are capped at ten.
 */

export interface QuestionDraft {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  helpText?: string;
  options?: string[];
  archived?: boolean;
  version?: number;
}

const QUESTION_TYPES: QuestionType[] = [
  "short_text",
  "long_text",
  "single_select",
  "multi_select",
  "number",
  "date",
];

const MAX_ACTIVE_QUESTIONS = 10;

export function QuestionBuilder({
  questions,
  onChange,
}: {
  questions: QuestionDraft[];
  onChange: (questions: QuestionDraft[]) => void;
}) {
  const { t } = useI18n();
  const activeQuestions = questions.filter(
    (question) => question.archived !== true
  );

  const updateQuestion = (id: string, patch: Partial<QuestionDraft>) => {
    onChange(
      questions.map((question) =>
        question.id === id ? { ...question, ...patch } : question
      )
    );
  };

  const moveQuestion = (id: string, direction: -1 | 1) => {
    const activeIds = activeQuestions.map((question) => question.id);
    const current = activeIds.indexOf(id);
    const target = current + direction;
    if (current < 0 || target < 0 || target >= activeIds.length) return;

    const targetId = activeIds[target];
    const currentPosition = questions.findIndex((item) => item.id === id);
    const targetPosition = questions.findIndex((item) => item.id === targetId);
    if (currentPosition < 0 || targetPosition < 0) return;

    const next = [...questions];
    [next[currentPosition], next[targetPosition]] = [
      next[targetPosition],
      next[currentPosition],
    ];
    onChange(next);
  };

  const errors = useMemo(() => {
    const result = new Map<string, string>();
    const labels = new Map<string, string>();

    for (const question of activeQuestions) {
      const label = question.label.trim();

      if (!label) {
        result.set(question.id, t("settings.questionLabelRequired"));
      } else {
        const key = label.toLocaleLowerCase();
        const duplicate = labels.get(key);
        if (duplicate) {
          result.set(question.id, t("settings.questionLabelDuplicate"));
          result.set(duplicate, t("settings.questionLabelDuplicate"));
        } else {
          labels.set(key, question.id);
        }
      }

      if (
        question.type === "single_select" ||
        question.type === "multi_select"
      ) {
        const options = (question.options ?? [])
          .map((option) => option.trim())
          .filter(Boolean);
        if (options.length < 2 || new Set(options).size !== options.length) {
          result.set(question.id, t("settings.questionOptionsRequired"));
        }
      }
    }

    return result;
  }, [activeQuestions, t]);

  const addQuestion = () => {
    if (activeQuestions.length >= MAX_ACTIVE_QUESTIONS) {
      toast.error(t("settings.questionLimit"));
      return;
    }
    onChange([
      ...questions,
      {
        id: `question_${crypto.randomUUID()}`,
        label: "",
        type: "short_text",
        required: false,
        helpText: "",
        options: undefined,
        archived: false,
        version: 1,
      },
    ]);
  };

  const archiveQuestion = (question: QuestionDraft) => {
    const confirmed = window.confirm(t("settings.archiveQuestionConfirm"));
    if (!confirmed) return;
    updateQuestion(question.id, {
      archived: true,
    });
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{t("settings.questions")}</h3>
          <p className="text-xs text-muted-foreground">
            {t("settings.questionsHint")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addQuestion}
          disabled={activeQuestions.length >= MAX_ACTIVE_QUESTIONS}
        >
          <Plus className="size-4" />
          {t("settings.addQuestion")}
        </Button>
      </div>

      {activeQuestions.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-xs text-muted-foreground">
          {t("settings.questionsHint")}
        </p>
      ) : (
        <div className="space-y-3">
          {questions.map((question) => {
            if (question.archived) return null;

            const activeIndex = activeQuestions.findIndex(
              (item) => item.id === question.id
            );
            const error = errors.get(question.id);
            const errorId = `question-error-${question.id}`;

            return (
              <div key={question.id} className="space-y-3 rounded-lg border p-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_170px_auto_auto_auto_auto]">
                  <div className="space-y-1.5">
                    <Label htmlFor={`question-label-${question.id}`}>
                      {t("settings.questionLabel")}
                    </Label>
                    <Input
                      id={`question-label-${question.id}`}
                      value={question.label}
                      maxLength={120}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? errorId : undefined}
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          label: event.target.value,
                        })
                      }
                    />
                    {error && (
                      <p id={errorId} className="text-xs text-destructive">
                        {error}
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`question-type-${question.id}`}>
                      {t("settings.questionType")}
                    </Label>
                    <Select
                      value={question.type}
                      onValueChange={(value) =>
                        updateQuestion(question.id, {
                          type: (value ?? "short_text") as QuestionType,
                          options:
                            value === "single_select" ||
                            value === "multi_select"
                              ? question.options ?? ["", ""]
                              : undefined,
                        })
                      }
                    >
                      <SelectTrigger
                        id={`question-type-${question.id}`}
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUESTION_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {t(`settings.types.${type}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2 pb-0.5">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(event) =>
                          updateQuestion(question.id, {
                            required: event.target.checked,
                          })
                        }
                      />
                      {t("settings.questionRequired")}
                    </label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="self-end"
                    aria-label={t("settings.moveUp")}
                    disabled={activeIndex <= 0}
                    onClick={() => moveQuestion(question.id, -1)}
                  >
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="self-end"
                    aria-label={t("settings.moveDown")}
                    disabled={activeIndex >= activeQuestions.length - 1}
                    onClick={() => moveQuestion(question.id, 1)}
                  >
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="self-end"
                    aria-label={t("settings.deleteQuestion")}
                    onClick={() => archiveQuestion(question)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`question-help-${question.id}`}>
                    {t("settings.questionHelp")}
                  </Label>
                  <Input
                    id={`question-help-${question.id}`}
                    value={question.helpText ?? ""}
                    maxLength={200}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        helpText: event.target.value,
                      })
                    }
                  />
                </div>

                {(question.type === "single_select" ||
                  question.type === "multi_select") && (
                  <div className="space-y-2">
                    {(question.options ?? []).map((option, optionIndex) => (
                      <div
                        key={`${question.id}-${optionIndex}`}
                        className="flex items-center gap-2"
                      >
                        <Input
                          value={option}
                          maxLength={80}
                          placeholder={`${t("settings.addOption")} ${
                            optionIndex + 1
                          }`}
                          onChange={(event) =>
                            updateQuestion(question.id, {
                              options: (question.options ?? []).map(
                                (item, index) =>
                                  index === optionIndex
                                    ? event.target.value
                                    : item
                              ),
                            })
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={t("settings.remove")}
                          onClick={() =>
                            updateQuestion(question.id, {
                              options: (question.options ?? []).filter(
                                (_, index) => index !== optionIndex
                              ),
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateQuestion(question.id, {
                          options: [...(question.options ?? []), ""],
                        })
                      }
                    >
                      <Plus className="size-4" />
                      {t("settings.addOption")}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeQuestions.length > 0 && (
        <fieldset className="space-y-3 rounded-lg border border-dashed p-3">
          <legend className="px-1 text-sm font-semibold">
            {t("settings.previewTitle")}
          </legend>
          <p className="text-xs text-muted-foreground">
            {t("settings.previewHint")}
          </p>
          {activeQuestions.map((question) => (
            <div key={`preview-${question.id}`} className="space-y-1.5">
              <p className="text-sm font-medium">
                {question.label || t("settings.questionLabel")}
                {question.required && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({t("common.required")})
                  </span>
                )}
              </p>
              {question.helpText && (
                <p className="text-xs text-muted-foreground">
                  {question.helpText}
                </p>
              )}
              <div
                className="rounded-md border border-input bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
                aria-hidden="true"
              >
                {t(`settings.types.${question.type}`)}
              </div>
            </div>
          ))}
        </fieldset>
      )}
    </section>
  );
}
