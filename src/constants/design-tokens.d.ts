declare const designTokens: {
  readonly figma: Readonly<Record<string, string>>;
  readonly colors: {
    readonly accent: Readonly<Record<string, string>>;
    readonly text: Readonly<Record<string, string>>;
    readonly icon: Readonly<Record<string, string>>;
    readonly surface: Readonly<Record<string, string>>;
    readonly border: Readonly<Record<string, string>>;
    readonly background: Readonly<Record<string, string>>;
    readonly status: Readonly<Record<string, string>>;
    readonly feedback: Readonly<Record<string, string>>;
    readonly map: Readonly<Record<string, string>>;
    readonly zone: Readonly<Record<string, string>>;
    readonly overlay: Readonly<Record<string, string>>;
  };
  readonly spacing: Readonly<Record<string, number>>;
  readonly radii: Readonly<Record<string, number>>;
  readonly typography: Readonly<
    Record<
      string,
      {
        readonly fontSize: number;
        readonly lineHeight: number;
        readonly fontWeight: string;
      }
    >
  >;
  readonly shadows: Readonly<Record<string, string>>;
  readonly glass: Readonly<Record<string, number>>;
  readonly home: Readonly<Record<string, number>>;
};

export = designTokens;
