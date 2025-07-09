import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react'; // useCallback اضافه شد

// ... (بقیه interface ها مانند UserRole, JwtPayload, AuthContextType)
interface UserRole {
  name: string;
}

interface JwtPayload {
  username?: string;
  role?: string | string[];
}

interface AuthContextType {
  username: string;
  userRoles: UserRole[];
  activeRoleName: string | null;
  updateActiveRole: (newRoleName: string) => void;
  loadAuthData: () => void; // **اضافه شد: تابعی برای بارگذاری مجدد داده های احراز هویت**
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ... (تابع decodeJwtToken بدون تغییر)
const decodeJwtToken = (token: string): JwtPayload | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join(''),
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error decoding JWT token:", e);
    return null;
  }
};


interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [username, setUsername] = useState<string>('Guest');
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [activeRoleName, setActiveRoleName] = useState<string | null>(null);

  // **تابع loadAuthData با useCallback برای پایداری**
  const loadAuthData = useCallback(() => {
    const authToken = localStorage.getItem('authToken');
    if (authToken) {
      const decodedToken = decodeJwtToken(authToken);
      if (decodedToken) {
        setUsername(decodedToken.username || 'Kullanıcı');

        let roles: UserRole[] = [];
        if (Array.isArray(decodedToken.role)) {
          roles = decodedToken.role.map((roleName: string) => ({ name: roleName }));
        } else if (typeof decodedToken.role === 'string') {
          roles = [{ name: decodedToken.role }];
        }
        setUserRoles(roles);

        const savedActiveRoleName = localStorage.getItem('activeUserRoleName');
        if (savedActiveRoleName && roles.some(r => r.name === savedActiveRoleName)) {
          setActiveRoleName(savedActiveRoleName);
        } else if (roles.length > 0) {
          setActiveRoleName(roles[0].name);
          localStorage.setItem('activeUserRoleName', roles[0].name);
        } else {
          setActiveRoleName('Rol Yok');
        }
      } else {
        setUsername('Guest');
        setUserRoles([]);
        setActiveRoleName('Rol Yok');
        localStorage.removeItem('activeUserRoleName');
        localStorage.removeItem('authToken');
      }
    } else {
      setUsername('Guest');
      setUserRoles([]);
      setActiveRoleName('Rol Yok');
      localStorage.removeItem('activeUserRoleName');
    }
  }, []); // [] به این معنی است که loadAuthData فقط یک بار در زمان mount ساخته می‌شود

  // useEffect برای بارگذاری اولیه و تنظیم شنونده رویداد storage
  useEffect(() => {
    loadAuthData(); // بارگذاری اولیه

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'authToken' || event.key === 'activeUserRoleName') {
        loadAuthData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadAuthData]); // loadAuthData به عنوان dependency اضافه شد

  const updateActiveRole = (newRoleName: string) => {
    setActiveRoleName(newRoleName);
    localStorage.setItem('activeUserRoleName', newRoleName);
  };

  const authContextValue: AuthContextType = {
    username,
    userRoles,
    activeRoleName,
    updateActiveRole,
    loadAuthData, // **اضافه شد به Context Value**
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};