export const sections = Array.from({ length: 20 }, (_, index) => String.fromCharCode(65 + index));

export function normalizeName(value) {
  return value.trim().replace(/\s+/g, ' ');
}

export function validate(state, nameFits = true) {
  const errors = {};
  if (!['9', '10', '11', '12'].includes(state.classValue)) errors.classValue = 'Select class 9, 10, 11, or 12.';
  if (!sections.includes(state.section)) errors.section = 'Choose one section from A to T.';
  if (!normalizeName(state.name)) errors.name = 'Enter a full name.';
  else if (!nameFits) errors.name = 'This name will not fit legibly on the card. Please shorten it.';
  if (!/^[0-9]{10}$/.test(state.phone)) errors.phone = 'Enter exactly 10 digits, using numbers 0–9 only.';
  if (!state.photo) errors.photo = 'Choose a JPG, PNG, or WebP photograph.';
  return errors;
}
