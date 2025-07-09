import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

// تعریف نوع برای رول کاربر
interface UserRole {
  name: string;
  // اگر ID هم از توکن می‌آید، می‌توانید اینجا اضافه کنید
  // id?: number;
}

// تعریف نوع برای Payload توکن JWT
interface JwtPayload {
  username?: string;
  role?: string | string[]; // می تواند یک رشته یا آرایه ای از رشته ها باشد
  // سایر فیلدهای توکن
}

// تعریف نوع برای مقادیر Context
interface AuthContextType {
  username: string;
  userRoles: UserRole[];
  activeRoleName: string | null;
  updateActiveRole: (newRoleName: string) => void;
  // می توانید لودینگ یا ارور احراز هویت را هم اینجا اضافه کنید
}

// مقدار پیش‌فرض Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// تابع Decode کردن توکن JWT (می‌توانید آن را از utils/authUtils.ts ایمپورت کنید)
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

  // useEffect برای بارگذاری اولیه اطلاعات از توکن
  useEffect(() => {
    const loadAuthData = () => {
      const authToken = localStorage.getItem('authToken');
      if (authToken) {
        const decodedToken = decodeJwtToken(authToken);
        if (decodedToken) {debugger
          setUsername(decodedToken.username || 'Kullanıcı');

          let roles: UserRole[] = [];
          if (Array.isArray(decodedToken.role)) {
            roles = decodedToken.role.map((roleName: string) => ({ name: roleName }));
          } else if (typeof decodedToken.role === 'string') {
            roles = [{ name: decodedToken.role }];
          }
          setUserRoles(roles);

          // بارگذاری رول فعال از localStorage
          const savedActiveRoleName = localStorage.getItem('activeUserRoleName');
          if (savedActiveRoleName && roles.some(r => r.name === savedActiveRoleName)) {
            setActiveRoleName(savedActiveRoleName);
          } else if (roles.length > 0) {
            setActiveRoleName(roles[0].name);
            localStorage.setItem('activeUserRoleName', roles[0].name);
          } else {
            setActiveRoleName('Rol Yok');
          }
        }
      } else {
        setUsername('Guest');
        setUserRoles([]);
        setActiveRoleName('Rol Yok');
        localStorage.removeItem('activeUserRoleName'); // مطمئن شوید پاک شده
      }
    };

    loadAuthData();

    // اگر می‌خواهید با تغییر localStorage در تب‌های دیگر، این کامپوننت هم رفرش شود
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'authToken' || event.key === 'activeUserRoleName') {
        loadAuthData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // تابعی برای به‌روزرسانی رول فعال (از طریق Context)
  const updateActiveRole = (newRoleName: string) => {
    setActiveRoleName(newRoleName);
    localStorage.setItem('activeUserRoleName', newRoleName);
  };

  const authContextValue: AuthContextType = {
    username,
    userRoles,
    activeRoleName,
    updateActiveRole,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// هوک سفارشی برای استفاده از AuthContext
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};