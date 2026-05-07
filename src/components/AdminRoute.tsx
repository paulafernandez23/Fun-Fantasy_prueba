import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface AdminRouteProps {
  children: React.ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const isAdmin = useAuthStore(state => state.isAdmin);
  const isInitialized = useAuthStore(state => state.isInitialized);

  // Mientras inicializa el estado global de autenticación, no mostramos nada 
  // (App.tsx ya muestra un loader global)
  if (!isInitialized) {
    return null;
  }

  // Si está inicializado pero no es administrador, lo expulsamos a la home
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  // Si es admin, renderizamos la ruta (el panel)
  return <>{children}</>;
}
