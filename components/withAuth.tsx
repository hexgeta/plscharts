import { useRouter } from 'next/router';
import { PROTECTED_PAGES } from '@/config/protected-pages';
import AuthOverlay from './AuthOverlay';

export const withAuth = (WrappedComponent: React.ComponentType<any>) => {
  const WithAuthWrapper = (props: any) => {
    const router = useRouter();
    const isProtectedPage = PROTECTED_PAGES.includes(router.pathname);

    if (!isProtectedPage) {
      return <WrappedComponent {...props} />;
    }

    return (
      <AuthOverlay>
        <WrappedComponent {...props} />
      </AuthOverlay>
    );
  };

  // Copy display name for better debugging
  WithAuthWrapper.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return WithAuthWrapper;
}; 