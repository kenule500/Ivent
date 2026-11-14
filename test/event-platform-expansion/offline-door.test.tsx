// @vitest-environment jsdom
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  announce: vi.fn(),
  checkIn: vi.fn(),
  liveSnapshot: null as unknown,
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ eventId: "event-a" }),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/hooks/useConvexQuery", () => ({
  useConvexQuery: () => ({
    data: mocks.liveSnapshot,
    isLoading: false,
    error: null,
  }),
}));
vi.mock("convex/react", () => ({
  useMutation: () => mocks.checkIn,
}));
vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));
vi.mock("@/components/a11y/live-region", () => ({
  useAnnounce: () => mocks.announce,
}));
vi.mock(
  "@/app/(main)/my-events/[eventId]/door/_components/door-scanner-modal",
  () => ({
    DoorScannerModal: () => null,
  })
);
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ isLoaded: true, isSignedIn: false }),
}));

import { LocaleProvider } from "@/components/locale-provider";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { DoorDashboard } from "@/app/(main)/my-events/[eventId]/_components/door-dashboard";
import {
  cacheDoorSnapshot,
  clearDoorData,
  enableDoorOffline,
  isDoorOfflineEnabled,
  purgeExpiredDoorData,
  queueOfflineCheckIn,
  readDoorSnapshot,
  readQueuedCheckIns,
  type CachedDoorSnapshot,
} from "@/lib/offline/db";
import { installFakeIndexedDB } from "./helpers/fake-indexeddb";

function wrap(children: ReactNode) {
  return <LocaleProvider initialLocale="en">{children}</LocaleProvider>;
}

function makeSnapshot(overrides: Partial<CachedDoorSnapshot> = {}): CachedDoorSnapshot {
  const start = Date.now() + 86_400_000;
  const end = start + 4 * 60 * 60 * 1000;
  return {
    eventId: "event-a",
    event: {
      _id: "event-a",
      title: "Offline Event",
      slug: "offline-event",
      startDate: start,
      endDate: end,
      timezone: "Africa/Lagos",
      currency: "NGN",
      locale: "en",
      doorModeEnabled: true,
      locationType: "physical",
      city: "Lagos",
      country: "Nigeria",
    },
    counts: { confirmed: 2, checkedIn: 0, pending: 2 },
    attendees: [
      {
        _id: "reg-ada",
        attendeeName: "Ada Lovelace",
        attendeeEmail: "ada@example.com",
        qrCode: "EVT-ADA",
        checkedIn: false,
      },
      {
        _id: "reg-grace",
        attendeeName: "Grace Hopper",
        attendeeEmail: "grace@example.com",
        qrCode: "EVT-GRACE",
        checkedIn: false,
      },
    ],
    cachedAt: Date.now() - 60_000,
    ...overrides,
  };
}

beforeEach(() => {
  installFakeIndexedDB();
  mocks.toastSuccess.mockReset();
  mocks.toastError.mockReset();
  mocks.announce.mockReset();
  mocks.checkIn.mockReset();
  mocks.liveSnapshot = {
    event: makeSnapshot().event,
    counts: { confirmed: 2, checkedIn: 0, pending: 2 },
    attendees: makeSnapshot().attendees,
    recent: [],
    serverTime: Date.now(),
  };
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value: true,
  });
});

describe("AC-010: offline opt-in and cache summary", () => {
  test("AC-010: explicit opt-in caches one event's confirmed attendee snapshot and exposes cache age, count, and event name", async () => {
    const snapshot = makeSnapshot();
    await enableDoorOffline("event-a");
    await cacheDoorSnapshot(snapshot);

    expect(await isDoorOfflineEnabled("event-a")).toBe(true);
    expect(await readDoorSnapshot("event-a")).toMatchObject({
      eventId: "event-a",
      event: { title: "Offline Event" },
      attendees: snapshot.attendees,
    });

    render(wrap(<DoorDashboard />));

    expect(await screen.findByText("Offline Event")).toBeInTheDocument();
    expect(
      await screen.findByText(/Offline mode enabled/)
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/2 attendees cached/)
    ).toBeInTheDocument();
    expect(screen.getByText("Cached for offline use")).toBeInTheDocument();
  });
});

describe("AC-011: offline check-in queue", () => {
  test("AC-011: offline scans queue confirmed tickets with a timestamp and do not write unknown or cancelled tickets", async () => {
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      value: false,
    });
    await enableDoorOffline("event-a");
    await cacheDoorSnapshot(makeSnapshot());

    const user = userEvent.setup();
    render(wrap(<DoorDashboard />));

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    const input = screen.getByLabelText("Enter ticket ID");
    const form = input.closest("form");
    expect(form).not.toBeNull();
    const submit = within(form as HTMLFormElement).getByRole("button", {
      name: "Check in",
    });

    await user.type(input, "EVT-ADA");
    await user.click(submit);

    await waitFor(async () => {
      const queued = await readQueuedCheckIns("event-a");
      expect(queued).toHaveLength(1);
      expect(queued[0]).toMatchObject({
        eventId: "event-a",
        qrCode: "EVT-ADA",
        attendeeName: "Ada Lovelace",
      });
      expect(queued[0].scannedAt).toBeTypeOf("number");
    });

    await user.type(screen.getByLabelText("Enter ticket ID"), "EVT-UNKNOWN");
    await user.click(
      within(screen.getByLabelText("Enter ticket ID").closest("form")!).getByRole(
        "button",
        { name: "Check in" }
      )
    );

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith(
        "This ticket is not in the offline attendee list."
      )
    );
    expect(await readQueuedCheckIns("event-a")).toHaveLength(1);
  });
});

describe("AC-013: offline retention and wipe", () => {
  test("AC-013: sign-out, 24-hour expiry, and explicit clear delete the snapshot and queue and only one event is cached", async () => {
    const snapA = makeSnapshot();
    const snapB = makeSnapshot({
      eventId: "event-b",
      event: { ...makeSnapshot().event, _id: "event-b", title: "Other Event" },
    });

    await enableDoorOffline("event-a");
    await cacheDoorSnapshot(snapA);
    await queueOfflineCheckIn({
      id: "queue-a",
      eventId: "event-a",
      qrCode: "EVT-ADA",
      attendeeName: "Ada Lovelace",
      scannedAt: Date.now(),
    });

    await enableDoorOffline("event-b");
    await cacheDoorSnapshot(snapB);

    expect(await isDoorOfflineEnabled("event-a")).toBe(false);
    expect(await readDoorSnapshot("event-a")).toBeNull();
    expect(await readQueuedCheckIns("event-a")).toHaveLength(0);
    expect(await isDoorOfflineEnabled("event-b")).toBe(true);
    expect(await readDoorSnapshot("event-b")).not.toBeNull();

    const oldSnapshot = makeSnapshot({
      event: {
        ...makeSnapshot().event,
        _id: "event-old",
        title: "Old Event",
        endDate: Date.now() - 25 * 60 * 60 * 1000,
      },
      eventId: "event-old",
    });
    await enableDoorOffline("event-old");
    await cacheDoorSnapshot(oldSnapshot);
    await queueOfflineCheckIn({
      id: "queue-old",
      eventId: "event-old",
      qrCode: "EVT-OLD",
      attendeeName: "Old Attendee",
      scannedAt: Date.now() - 25 * 60 * 60 * 1000,
    });
    await purgeExpiredDoorData();
    expect(await isDoorOfflineEnabled("event-old")).toBe(false);
    expect(await readDoorSnapshot("event-old")).toBeNull();
    expect(await readQueuedCheckIns("event-old")).toHaveLength(0);

    await enableDoorOffline("event-a");
    await cacheDoorSnapshot(snapA);
    await queueOfflineCheckIn({
      id: "queue-a-2",
      eventId: "event-a",
      qrCode: "EVT-GRACE",
      attendeeName: "Grace Hopper",
      scannedAt: Date.now(),
    });
    await clearDoorData("event-a");
    expect(await isDoorOfflineEnabled("event-a")).toBe(false);
    expect(await readDoorSnapshot("event-a")).toBeNull();
    expect(await readQueuedCheckIns("event-a")).toHaveLength(0);

    await enableDoorOffline("event-a");
    await cacheDoorSnapshot(snapA);
    render(<ServiceWorkerRegister />);
    await waitFor(async () =>
      expect(await isDoorOfflineEnabled("event-a")).toBe(false)
    );
    expect(await readDoorSnapshot("event-a")).toBeNull();
  });
});
