// front/src/components/layout/ProtectedRoute.jsx
// COMPONENTE PARA PROTEGER RUTAS POR ROL

import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../../services/authService';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const isAuthenticated = authService.isAuthenticated();
  const userRol = authService.getRol();

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si hay roles permitidos y el usuario no tiene uno, redirigir al dashboard según su rol
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRol)) {
    // Redirigir según el rol del usuario
    if (userRol === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (userRol === 'docente') {
      return <Navigate to="/docente" replace />;
    } else {
      return <Navigate to="/estudiante" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;