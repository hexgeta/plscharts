import { useRouter } from 'next/router';
import { PROTECTED_PAGES } from '@/config/protected-pages';
import AuthOverlay from './AuthOverlay';
import PaywallOverlay from './PaywallOverlay';
import { useAuth } from '@/hooks/useAuth';
import { useWhitelist } from '@/hooks/useWhitelist';

export const withAuth = (WrappedComponent: React.ComponentType<any>) => {
  const WithAuthWrapper = (props: any) => {
    const router = useRouter();
    const { isAuthenticated, user } = useAuth();
    const { isWhitelisted, isLoading } = useWhitelist(user?.email);
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

    // Show loading state while checking whitelist status
    if (isLoading) {
      return <div>Loading...</div>;
    }

    // If authenticated but not whitelisted, show paywall
    if (!isWhitelisted) {
      return <PaywallOverlay pageName={pageName} />;
    }

    // If authenticated and whitelisted, show content
    return <WrappedComponent {...props} />;
  };

  // Copy display name for better debugging
  WithAuthWrapper.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return WithAuthWrapper;
}; 