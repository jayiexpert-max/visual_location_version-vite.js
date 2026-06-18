const EMPLOYEE_PHOTO_BASE = 'http://199.10.10.170/Allpic';

export function isEmployeePhotoUsername(username: string): boolean {
  return username.length === 6 && /^\d+$/.test(username);
}

export function getEmployeePhotoUrl(username: string): string {
  return `${EMPLOYEE_PHOTO_BASE}/${username}.jpg`;
}
