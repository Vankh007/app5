export const getImageUrl = (path?: string | null): string => {
  if (!path) return '';
  // If it's already a full URL, return it
  if (path.startsWith('http')) return path;
  // Otherwise, assume it's a relative path that needs a base URL
  // TODO: Replace with your actual image CDN URL
  return `https://image.tmdb.org/t/p/w500${path}`;
};

export const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Unknown';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const getAge = (birthday: string | null): string => {
  if (!birthday) return '';
  const birthDate = new Date(birthday);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return `${age - 1} years old`;
  }
  return `${age} years old`;
};

export const getGenderLabel = (gender: number | null): string => {
  switch (gender) {
    case 1: return 'Female';
    case 2: return 'Male';
    case 3: return 'Non-binary';
    default: return 'Not specified';
  }
};
