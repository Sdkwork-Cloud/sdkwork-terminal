import {
  createRuntimeTabController,
  type RuntimeTabController,
} from "./runtime-tab-controller.ts";

export interface RuntimeTabControllerStore {
  getOrCreate: (tabId: string) => RuntimeTabController;
  syncTabs: (tabIds: Iterable<string>) => Promise<void>;
  disposeAll: () => Promise<void>;
}

export interface RuntimeTabControllerStoreOptions {
  createController?: () => RuntimeTabController;
}

export function createRuntimeTabControllerStore(
  options: RuntimeTabControllerStoreOptions = {},
): RuntimeTabControllerStore {
  const createController = options.createController ?? createRuntimeTabController;
  const controllers = new Map<string, RuntimeTabController>();

  return {
    getOrCreate(tabId) {
      const existingController = controllers.get(tabId);
      if (existingController) {
        return existingController;
      }

      const nextController = createController();
      controllers.set(tabId, nextController);
      return nextController;
    },
    async syncTabs(tabIds) {
      const activeTabIds = new Set(tabIds);
      const controllersToDispose: RuntimeTabController[] = [];

      for (const [tabId, controller] of controllers.entries()) {
        if (activeTabIds.has(tabId)) {
          continue;
        }

        controllers.delete(tabId);
        controllersToDispose.push(controller);
      }

      await Promise.all(controllersToDispose.map((controller) => controller.dispose()));
    },
    async disposeAll() {
      const controllersToDispose = [...controllers.values()];
      controllers.clear();
      await Promise.all(controllersToDispose.map((controller) => controller.dispose()));
    },
  };
}
