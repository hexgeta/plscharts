import { useRouter } from 'next/router';
import { PROTECTED_PAGES } from '@/config/protected-pages';
import AuthOverlay from './AuthOverlay';
import PaywallOverlay from './PaywallOverlay';
import { useAuth } from '@/hooks/useAuth';
import { isEmailWhitelisted } from '@/config/whitelisted-handles';

export const withAuth = (WrappedComponent: React.ComponentType<any>) => {
  const WithAuthWrapper = (props: any) => {
    const router = useRouter();
    const { isAuthenticated, user } = useAuth();
    const isProtectedPage = PROTECTED_PAGES.includes(router.pathname);
    const pageName = router.pathname.substring(1).split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    if (!isProtectedPage) {
      return <WrappedComponent {...props} />;
    }

    // If not authenticated, show login overlay
    if (!isAuthenticated) {
      return <AuthOverlay>{/* Don't render protected content */}</AuthOverlay>;
    }

    // If authenticated but not whitelisted, show paywall
    const userEmail = user?.email;
    if (userEmail && !isEmailWhitelisted(userEmail)) {
      return <PaywallOverlay pageName={pageName} />;
    }

    // If authenticated and whitelisted, show content
    return <WrappedComponent {...props} />;
  };

  // Copy display name for better debugging
  WithAuthWrapper.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return WithAuthWrapper;
}; 