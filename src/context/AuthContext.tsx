// AuthProvider.tsx
import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';

interface UserRole {
  name: string;
}

interface JwtPayload {
  username?: string;
  role?: string | string[]; // role می تواند یک رشته یا آرایه ای از رشته ها باشد
}

interface AuthContextType {
  username: string;
  userRoles: UserRole[];
  activeRoleName: string | null;
  updateActiveRole: (newRoleName: string) => void;
  loadAuthData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  const loadAuthData = useCallback(() => {
    const authToken = localStorage.getItem('authToken');
    const savedActiveRoleName = localStorage.getItem('activeUserRoleName');
    const savedUsername = localStorage.getItem('lastLoggedInUsername'); // نام کاربری ذخیره شده از لاگین قبلی

    if (authToken) {
      const decodedToken = decodeJwtToken(authToken);

      // مطمئن می شویم توکن دیکد شده و نام کاربری در آن وجود دارد
      if (decodedToken && decodedToken.username) {
        const currentUsername = decodedToken.username;
        setUsername(currentUsername);

        let rolesFromToken: UserRole[] = [];
        if (Array.isArray(decodedToken.role)) {
          rolesFromToken = decodedToken.role.map((roleName: string) => ({ name: roleName }));
        } else if (typeof decodedToken.role === 'string') {
          rolesFromToken = [{ name: decodedToken.role }];
        }
        setUserRoles(rolesFromToken);

        let roleToActivate: string | null = null;

        // 1. بررسی کن که آیا کاربر فعلی همان کاربر قبلی است
        if (currentUsername === savedUsername) {debugger
          // 2. اگر همان کاربر قبلی است، آخرین نقش انتخابی ذخیره شده را بررسی کن
          if (savedActiveRoleName) {
            // 3. اگر نقش ذخیره شده در لیست نقش های فعلی کاربر از توکن موجود است
            if (rolesFromToken.some(r => r.name === savedActiveRoleName)) {
              roleToActivate = savedActiveRoleName; // همان نقش ذخیره شده را فعال کن
            }
          }
        }

        // 4. اگر نقش فعال هنوز انتخاب نشده (یعنی کاربر جدید است یا نقش ذخیره شده معتبر نیست)
        if (!roleToActivate && rolesFromToken.length > 0) {
          roleToActivate = rolesFromToken[0].name; // اولین نقش موجود در توکن را فعال کن
        }

        // 5. اگر هیچ نقشی برای فعال شدن پیدا نشد
        if (roleToActivate) {
          setActiveRoleName(roleToActivate);
          localStorage.setItem('activeUserRoleName', roleToActivate);
        } else {
          // هیچ نقشی برای کاربر وجود ندارد
          setActiveRoleName('Rol Yok');
          localStorage.removeItem('activeUserRoleName');
        }

        // همیشه نام کاربری فعلی را برای لاگین بعدی ذخیره کن
        localStorage.setItem('lastLoggedInUsername', currentUsername);

      } else {
        // توکن نامعتبر است یا نام کاربری ندارد
        setUsername('Guest');
        setUserRoles([]);
        setActiveRoleName('Rol Yok');
        localStorage.removeItem('activeUserRoleName');
        localStorage.removeItem('lastLoggedInUsername');
        localStorage.removeItem('authToken');
      }
    } else {
      // authToken وجود ندارد (کاربر لاگ اوت کرده)
      setUsername('Guest');
      setUserRoles([]);
      setActiveRoleName('Rol Yok');
      localStorage.removeItem('activeUserRoleName');
      localStorage.removeItem('lastLoggedInUsername');
    }
  }, []);

  useEffect(() => {
    loadAuthData(); // بارگذاری اولیه هنگام mount

    const handleStorageChange = (event: StorageEvent) => {
      // گوش دادن به تغییرات key های مربوط به احراز هویت
      if (event.key === 'authToken' || event.key === 'activeUserRoleName' || event.key === 'lastLoggedInUsername') {
        loadAuthData(); // بارگذاری مجدد داده ها در صورت تغییر
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange); // پاکسازی شنونده
    };
  }, [loadAuthData]); // loadAuthData به عنوان dependency برای useEffect

  const updateActiveRole = (newRoleName: string) => {
    // فقط در صورتی نقش را به‌روزرسانی کن که در userRoles کاربر موجود باشد
    if (userRoles.some(r => r.name === newRoleName)) {
      setActiveRoleName(newRoleName);
      localStorage.setItem('activeUserRoleName', newRoleName);
    } else {
      console.warn(`Attempted to set an invalid role: ${newRoleName}. Role not found in user's assigned roles.`);
      // می‌توانید اینجا یک showAlert هم برای کاربر نمایش دهید که نقش نامعتبر است.
    }
  };

  const authContextValue: AuthContextType = {
    username,
    userRoles,
    activeRoleName,
    updateActiveRole,
    loadAuthData,
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