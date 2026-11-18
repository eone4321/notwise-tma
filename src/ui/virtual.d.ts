declare module 'virtual:guide-art' {
  const paths: string[];
  export default paths;
}

interface ImportMeta {
  readonly env: { readonly VITE_GUIDE_TMA_URL?: string };
}
