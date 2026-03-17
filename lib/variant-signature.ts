type OptionRecord = {
  optionName?: string;
  name?: string;
  optionValue?: string;
  value?: string;
};

type VariantRecord = {
  optionSignature: string;
  isSoldOut: boolean;
};

function decodeSignature(signature: string): string {
  try {
    return decodeURIComponent(signature);
  } catch {
    return signature;
  }
}

export function parseVariantSignature(signature: string): Record<string, string> {
  const decoded = decodeSignature(signature);
  if (!decoded || decoded === '__default__' || decoded === 'default') return {};

  return decoded.split('|').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, rawValue] = part.split('=');
    if (!rawKey || rawValue == null) return acc;
    const key = rawKey.trim();
    const value = rawValue.trim();
    if (!key || !value) return acc;
    acc[key] = value;
    return acc;
  }, {});
}

function toOptions(optionData: unknown): OptionRecord[] {
  if (!optionData || typeof optionData !== 'object') return [];
  return Array.isArray(optionData) ? (optionData as OptionRecord[]) : [optionData as OptionRecord];
}

export function toSelectedOptionMap(optionData: unknown): Record<string, string> {
  return toOptions(optionData).reduce<Record<string, string>>((acc, option) => {
    const key = (option.optionName ?? option.name ?? '').trim();
    const value = (option.optionValue ?? option.value ?? '').trim();
    if (key && value) acc[key] = value;
    return acc;
  }, {});
}

export function findMatchedVariant(variants: VariantRecord[], optionData: unknown): VariantRecord | null {
  const selectedMap = toSelectedOptionMap(optionData);
  const selectedKeys = Object.keys(selectedMap);

  if (selectedKeys.length === 0) {
    return variants.find((variant) => {
      const decoded = decodeSignature(variant.optionSignature);
      return decoded === '__default__' || decoded === 'default';
    }) ?? null;
  }

  return (
    variants.find((variant) => {
      const parsed = parseVariantSignature(variant.optionSignature);
      const parsedKeys = Object.keys(parsed);
      if (parsedKeys.length !== selectedKeys.length) return false;
      return selectedKeys.every((key) => parsed[key] === selectedMap[key]);
    }) ?? null
  );
}

export function isMatchedVariantSoldOut(variants: VariantRecord[], optionData: unknown): boolean {
  if (!Array.isArray(variants) || variants.length === 0) return false;
  const matched = findMatchedVariant(variants, optionData);
  return Boolean(matched?.isSoldOut);
}
