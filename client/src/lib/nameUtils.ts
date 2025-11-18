export function extractNameFromEmail(email: string | undefined | null) {
  if (!email) return { fullName: 'Usuário', initials: 'U' };

  // assume email format: nome.sobrenome@domain
  const localPart = email.split('@')[0];
  const parts = localPart.split(/[._]/).filter(Boolean);

  if (parts.length === 0) return { fullName: 'Usuário', initials: 'U' };

  // Capitalize parts
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  const firstName = cap(parts[0]);
  const lastName = parts.length > 1 ? cap(parts[1]) : '';

  const fullName = lastName ? `${firstName} ${lastName}` : firstName;

  // initials: first letters of first and last (if present)
  const initials = (firstName.charAt(0) + (lastName ? lastName.charAt(0) : '')).toUpperCase();

  return { fullName, initials };
}
