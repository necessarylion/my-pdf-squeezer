/// <reference types="vite/client" />

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module "./gs.worker?worker" {
  const WorkerConstructor: new () => Worker;
  export default WorkerConstructor;
}

declare module "@okathira/ghostpdl-wasm/gs.wasm?url" {
  const url: string;
  export default url;
}
