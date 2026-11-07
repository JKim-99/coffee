// Deployment can precede the additive D1 migration. Only fall back for this exact missing column.
export function missingInquiryOwnerColumn(error) {
  const message = `${error?.message || error} ${error?.cause?.message || ''}`;
  return /(?:no such column:\s*(?:\w+\.)?user_id\b|no column named user_id\b)/i.test(message);
}
