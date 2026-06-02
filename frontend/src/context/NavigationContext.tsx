import React, { createContext, useContext, useState } from "react";

export type ViewType = "login" | "register" | "home" | "profile" | "search";

export interface ViewParams {
  userId?: string;
  username?: string;
  query?: string;
}

interface NavigationContextType {
  currentView: ViewType;
  viewParams: ViewParams;
  navigateTo: (view: ViewType, params?: ViewParams) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewType>("login");
  const [viewParams, setViewParams] = useState<ViewParams>({});

  const navigateTo = (view: ViewType, params: ViewParams = {}) => {
    setCurrentView(view);
    setViewParams(params);
    // Smooth scroll back to top when navigating
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <NavigationContext.Provider value={{ currentView, viewParams, navigateTo }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
};
