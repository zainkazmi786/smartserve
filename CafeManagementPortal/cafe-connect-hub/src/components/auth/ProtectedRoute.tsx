import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * Protected Route Component
 * Guards routes that require authentication and valid role
 * Only allows manager and receptionist roles
 * Redirects to login if user is not authenticated or has invalid role
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  // Show nothing while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Validate role - only manager and receptionist can access this portal
  const userRole = user?.role?.name;
  const allowedRoles = ['manager', 'receptionist'];
  
  if (userRole && !allowedRoles.includes(userRole)) {
    // Invalid role - clear auth and redirect to login with error message
    // This handles cases where user might have changed role or token was manipulated
    return (
      <Navigate 
        to="/login" 
        state={{ 
          from: location,
          error: `Access denied. This portal is only for managers and receptionists. Your role (${userRole}) is not authorized.`
        }} 
        replace 
      />
    );
  }

  return <>{children}</>;
}
