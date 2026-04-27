import test from "node:test";
import assert from "node:assert/strict";

import * as launchProjectDialogModel from "../packages/sdkwork-terminal-shell/src/launch-project-dialog-model.ts";

const {
  filterLaunchProjects,
  resolveBoundedLaunchProjectIndex,
  resolveNextLaunchProjectIndex,
  resolvePreferredLaunchProjectIndex,
  shouldIgnoreLaunchProjectPickerNavigationTarget,
} = launchProjectDialogModel;

const projects = [
  {
    name: "SDKWork Terminal",
    path: "D:\\javasource\\spring-ai-plus\\apps\\sdkwork-terminal",
  },
  {
    name: "Backend API",
    path: "D:\\javasource\\spring-ai-plus\\backend",
  },
  {
    name: "Design System",
    path: "D:\\workspace\\ui\\design-system",
  },
];

function createKeyboardTarget(overrides: Partial<{
  tagName: string;
  closestResult: unknown;
  closest: (selector: string) => unknown;
}> = {}) {
  return {
    tagName: "DIV",
    closest(selector: string) {
      if (typeof overrides.closest === "function") {
        return overrides.closest(selector);
      }
      return overrides.closestResult ?? null;
    },
    ...overrides,
  };
}

test("launch project dialog filters project names and paths case-insensitively", () => {
  assert.deepEqual(
    filterLaunchProjects(projects, "terminal").map((project) => project.name),
    ["SDKWork Terminal"],
  );
  assert.deepEqual(
    filterLaunchProjects(projects, "SPRING-AI").map((project) => project.name),
    ["SDKWork Terminal", "Backend API"],
  );
  assert.deepEqual(filterLaunchProjects(projects, "missing"), []);
  assert.equal(filterLaunchProjects(projects, "   "), projects);
});

test("launch project dialog resolves preferred and bounded active indexes", () => {
  assert.equal(
    resolvePreferredLaunchProjectIndex(
      projects,
      "d:\\javasource\\spring-ai-plus\\BACKEND",
    ),
    1,
  );
  assert.equal(resolvePreferredLaunchProjectIndex(projects, "D:\\not-found"), 0);
  assert.equal(resolvePreferredLaunchProjectIndex([], "D:\\not-found"), 0);
  assert.equal(resolveBoundedLaunchProjectIndex(2, projects.length, 0), 2);
  assert.equal(resolveBoundedLaunchProjectIndex(9, projects.length, 1), 1);
  assert.equal(resolveBoundedLaunchProjectIndex(-1, projects.length, 1), 1);
  assert.equal(resolveBoundedLaunchProjectIndex(1, 0, 0), 0);
});

test("launch project dialog keyboard navigation wraps without overriding focused action buttons", () => {
  assert.equal(resolveNextLaunchProjectIndex(0, 3, "next"), 1);
  assert.equal(resolveNextLaunchProjectIndex(2, 3, "next"), 0);
  assert.equal(resolveNextLaunchProjectIndex(0, 3, "previous"), 2);
  assert.equal(resolveNextLaunchProjectIndex(0, 0, "next"), 0);

  assert.equal(
    shouldIgnoreLaunchProjectPickerNavigationTarget(
      createKeyboardTarget({ tagName: "BUTTON" }),
    ),
    true,
  );
  assert.equal(
    shouldIgnoreLaunchProjectPickerNavigationTarget(
      createKeyboardTarget({
        tagName: "SPAN",
        closest: (selector) => selector.includes("button") ? {} : null,
      }),
    ),
    true,
  );
  assert.equal(
    shouldIgnoreLaunchProjectPickerNavigationTarget(
      createKeyboardTarget({ tagName: "INPUT" }),
    ),
    false,
  );
  assert.equal(
    shouldIgnoreLaunchProjectPickerNavigationTarget(
      createKeyboardTarget({ tagName: "DIV" }),
    ),
    false,
  );
});

test("launch project dialog row activation ignores nested action controls only", () => {
  const shouldIgnore =
    launchProjectDialogModel.shouldIgnoreLaunchProjectPickerRowActivationTarget;

  assert.equal(typeof shouldIgnore, "function");
  if (typeof shouldIgnore !== "function") {
    return;
  }

  assert.equal(
    shouldIgnore(createKeyboardTarget({ tagName: "BUTTON" })),
    true,
  );
  assert.equal(
    shouldIgnore(
      createKeyboardTarget({
        tagName: "SPAN",
        closest: (selector) =>
          selector.includes("[data-launch-project-picker-action]") ? {} : null,
      }),
    ),
    true,
  );
  assert.equal(
    shouldIgnore(
      createKeyboardTarget({
        tagName: "DIV",
        closest: (selector) =>
          selector.includes("[data-launch-project-picker-row]") ? {} : null,
      }),
    ),
    false,
  );
  assert.equal(shouldIgnore(createKeyboardTarget({ tagName: "DIV" })), false);
});
