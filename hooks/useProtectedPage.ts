import { useRouter } from 'next/router';
import { PROTECTED_PAGES } from '@/config/protected-pages';

export const useProtectedPage = () => {
  const router = useRouter();
  const currentPath = router.pathname;
  
  return PROTECTED_PAGES.includes(currentPath);
}; 