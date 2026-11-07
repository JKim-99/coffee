// Nicknames are plain names, not markup. Apostrophes and Unicode names remain valid.
export const validNickname = (value) => typeof value === 'string' && value.length >= 2 && value.length <= 30
  && /^[\p{L}\p{M}\p{N} ._'\-]+$/u.test(value);
export const validPassword = (value) => typeof value === 'string' && value.length >= 8 && value.length <= 128 && /\S/u.test(value);
