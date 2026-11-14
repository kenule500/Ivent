// @vitest-environment jsdom
import { useState } from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { QuestionType } from "@/convex/validators";

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  announce: vi.fn(),
  onClose: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("convex/react", () => ({
  useMutation: () => {
    const mutation = mocks.register;
    (mutation as unknown as { withOptimisticUpdate: () => unknown }).withOptimisticUpdate =
      () => mutation;
    return mutation;
  },
}));
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: {
      fullName: "Ada Lovelace",
      username: "ada",
      primaryEmailAddress: { emailAddress: "ada@example.com" },
    },
  }),
}));
vi.mock("sonner", () => ({
  toast: { success: mocks.toastSuccess, error: mocks.toastError },
}));
vi.mock("@/components/a11y/live-region", () => ({
  useAnnounce: () => mocks.announce,
}));

import { LocaleProvider } from "@/components/locale-provider";
import { QuestionBuilder, type QuestionDraft } from "@/app/(main)/my-events/[eventId]/_components/question-builder";
import RegisterModal from "@/app/(public)/events/[slug]/_components/register-modal";
import { validateAnswers, validateQuestionArray } from "@/convex/validators";

function wrap(children: React.ReactNode) {
  return <LocaleProvider initialLocale="en">{children}</LocaleProvider>;
}

function BuilderHarness({ initial }: { initial: QuestionDraft[] }) {
  const [questions, setQuestions] = useState(initial);
  return (
    <QuestionBuilder questions={questions} onChange={setQuestions} />
  );
}

const questions: QuestionDraft[] = [
  {
    id: "full_name",
    label: "Full name",
    type: "short_text",
    required: true,
    helpText: "Use the name on your ID.",
  },
  {
    id: "bio",
    label: "Short bio",
    type: "long_text",
    required: false,
  },
  {
    id: "meal",
    label: "Meal",
    type: "single_select",
    required: false,
    options: ["Vegan", "Halal"],
  },
  {
    id: "workshops",
    label: "Workshops",
    type: "multi_select",
    required: false,
    options: ["Accessibility", "Performance"],
  },
  {
    id: "years",
    label: "Years of experience",
    type: "number",
    required: false,
  },
  {
    id: "arrival",
    label: "Arrival date",
    type: "date",
    required: false,
  },
];

beforeEach(() => {
  mocks.register.mockReset();
  mocks.toastSuccess.mockReset();
  mocks.toastError.mockReset();
  mocks.announce.mockReset();
  mocks.onClose.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("AC-020: organizer question builder", () => {
  test("AC-020: the builder validates labels/options inline, supports six types, reorders, previews, caps at ten, and the server rejects invalid definitions", async () => {
    const user = userEvent.setup();
    render(
      wrap(
        <BuilderHarness
          initial={[
            {
              id: "name",
              label: "Name",
              type: "short_text",
              required: true,
              version: 1,
            },
            {
              id: "meal",
              label: "Meal",
              type: "single_select",
              required: false,
              options: ["", ""],
              version: 1,
            },
          ]}
        />
      )
    );

    expect(
      await screen.findAllByText(
        "Choice questions need at least two unique options."
      )
    ).not.toHaveLength(0);

    await user.type(screen.getByPlaceholderText("Add option 1"), "Vegan");
    await user.type(screen.getByPlaceholderText("Add option 2"), "Halal");
    await waitFor(() =>
      expect(
        screen.queryByText(
          "Choice questions need at least two unique options."
        )
      ).not.toBeInTheDocument()
    );

    const labels = screen.getAllByLabelText("Question");
    await user.clear(labels[1]);
    await user.type(labels[1], "Name");
    expect(
      await screen.findAllByText("Active questions need unique labels.")
    ).not.toHaveLength(0);
    await user.clear(labels[1]);
    await user.type(labels[1], "Meal");

    await user.click(screen.getAllByRole("button", { name: "Move down" })[0]);
    expect(
      screen
        .getAllByLabelText("Question")
        .map((input) => (input as HTMLInputElement).value)
    ).toEqual(["Meal", "Name"]);

    expect(screen.getByText("Attendee preview")).toBeInTheDocument();

    for (let index = 0; index < 8; index += 1) {
      await user.click(screen.getByRole("button", { name: "Add question" }));
    }
    expect(screen.getAllByLabelText("Question")).toHaveLength(10);
    expect(
      screen.getByRole("button", { name: "Add question" })
    ).toBeDisabled();

    const validQuestions = questions.map((question) => ({
      ...question,
      type: question.type as QuestionType,
    }));
    expect(() => validateQuestionArray(validQuestions)).not.toThrow();

    expect(() =>
      validateQuestionArray([
        {
          id: "empty",
          label: "   ",
          type: "short_text",
          required: false,
        },
      ])
    ).toThrow(/label/i);

    expect(() =>
      validateQuestionArray([
        {
          id: "choice",
          label: "Choice",
          type: "single_select",
          required: false,
          options: ["Only one"],
        },
      ])
    ).toThrow(/two options|at least two/i);

    expect(() =>
      validateQuestionArray([
        {
          id: "one",
          label: "Team",
          type: "short_text",
          required: false,
        },
        {
          id: "two",
          label: "team",
          type: "short_text",
          required: false,
        },
      ])
    ).toThrow(/unique/i);
  });
});

describe("AC-023: registration question form", () => {
  test("AC-023: the registration form renders current questions in order with labels, help, required marker, privacy note, and submits only on confirmation", async () => {
    const user = userEvent.setup();
    render(
      wrap(
        <RegisterModal
          event={{
            _id: "event-questions" as never,
            title: "Question Event",
            ticketType: "free",
            registrationQuestions: questions,
            locale: "en",
            timezone: "Africa/Lagos",
            currency: "NGN",
          }}
          isOpen
          onClose={mocks.onClose}
        />
      )
    );

    expect(screen.getByText("A few questions from the organizer")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your answers are shared with the organizer for this event only."
      )
    ).toBeInTheDocument();

    const renderedLabels = questions.map(
      (question) => screen.getByText(question.label, { exact: false })
    );
    renderedLabels.forEach((label, index) => {
      if (index === 0) return;
      expect(
        renderedLabels[index - 1].compareDocumentPosition(label) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });
    expect(screen.getByText("Use the name on your ID.")).toBeInTheDocument();
    expect(renderedLabels[0]).toHaveTextContent("*");

    await user.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await user.selectOptions(screen.getByLabelText("Meal"), "Vegan");
    await user.click(
      screen.getByRole("checkbox", { name: "Accessibility" })
    );
    await user.type(screen.getByLabelText("Years of experience"), "8");
    await user.type(screen.getByLabelText("Arrival date"), "2027-05-12");

    expect(mocks.register).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Register for Event" })
    );

    await waitFor(() => expect(mocks.register).toHaveBeenCalledTimes(1));
    expect(mocks.register.mock.calls[0][0]).toMatchObject({
      eventId: "event-questions",
      locale: "en",
      answers: expect.arrayContaining([
        { questionId: "full_name", value: "Ada Lovelace" },
        { questionId: "meal", value: "Vegan" },
        { questionId: "years", value: 8 },
        { questionId: "arrival", value: "2027-05-12" },
      ]),
    });
  });
});

describe("AC-024: registration answer validation", () => {
  test("AC-024: invalid answers show an accessible field error, keep values, create no registration, and are rejected server-side", async () => {
    const user = userEvent.setup();
    mocks.register.mockRejectedValueOnce(
      new Error('"Full name" is required.')
    );
    render(
      wrap(
        <RegisterModal
          event={{
            _id: "event-invalid" as never,
            title: "Invalid Answer Event",
            ticketType: "free",
            registrationQuestions: questions,
            locale: "en",
            timezone: "Africa/Lagos",
            currency: "NGN",
          }}
          isOpen
          onClose={mocks.onClose}
        />
      )
    );

    const fullName = screen.getByLabelText(/Full name/);
    await user.type(fullName, "   ");
    await user.click(
      screen.getByRole("button", { name: "Register for Event" })
    );

    expect.soft(await screen.findByRole("alert")).toHaveTextContent(
      '"Full name" is required.'
    );
    expect.soft(fullName.getAttribute("aria-invalid")).toBe("true");
    expect.soft(fullName).toHaveValue("   ");
    expect(mocks.register).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("You're All Set!")).not.toBeInTheDocument();

    const typedQuestions = questions.map((question) => ({
      ...question,
      type: question.type as QuestionType,
    }));
    expect(() => validateAnswers(typedQuestions, [])).toThrow(/required/i);
    expect(() =>
      validateAnswers(typedQuestions, [
        { questionId: "full_name", value: "Ada" },
        { questionId: "meal", value: "Pizza" },
      ])
    ).toThrow(/valid option/i);
    expect(() =>
      validateAnswers(typedQuestions, [
        { questionId: "full_name", value: "Ada" },
        { questionId: "years", value: "eight" },
      ])
    ).toThrow(/number/i);
    expect(() =>
      validateAnswers(typedQuestions, [
        { questionId: "full_name", value: "Ada" },
        { questionId: "arrival", value: "not-a-date" },
      ])
    ).toThrow(/valid date/i);
  });
});
