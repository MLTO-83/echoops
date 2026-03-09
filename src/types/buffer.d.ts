declare module "buffer" {
  export const Buffer: {
    from: (
      data: string,
      encoding?: string
    ) => {
      toString: (encoding?: string) => string;
    };
    alloc: (size: number) => any;
    isBuffer: (obj: any) => boolean;
  };
}
