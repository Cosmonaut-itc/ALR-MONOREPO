// client/lib/auth.ts
import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import NetInfo from '@react-native-community/netinfo';
import { useState, useEffect } from "react";

export const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000",
  plugins: [
    expoClient({
      scheme: "myapp",
      storagePrefix: "myapp",
      storage: SecureStore,
    })
  ]
});

// Custom hook to handle online/offline auth
export function useAuthWithOffline() {
  const { data: session, isPending } = authClient.useSession();
  type Session = typeof session;
  type User = NonNullable<Session>['user'];
  const [isOnline, setIsOnline] = useState(true);
  const [cachedUser, setCachedUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline((state.isConnected ?? false) && (state.isInternetReachable ?? false));
    });

    // Load cached user data on app start
    loadCachedUser();

    return unsubscribe;
  }, []);

  // Cache user data when online
  useEffect(() => {
    if (session?.user && isOnline) {
      cacheUserData(session.user);
      setCachedUser(session.user);
    }
  }, [session, isOnline]);

  const signIn = async (email: string, password: string) => {
    if (isOnline) {
      try {
        const result = await authClient.signIn.email({
          email,
          password,
        });
        if (result.data?.user) {
          await cacheUserData(result.data.user);
          setCachedUser(result.data.user);
        }
        return result;
      } catch (error) {
        // If network fails, try cached credentials
        return attemptOfflineSignIn(email, password);
      }
    } else {
      return attemptOfflineSignIn(email, password);
    }
  };

  const signOut = async () => {
    if (isOnline) {
      await authClient.signOut();
    }
    // Always clear local cache
    await clearCachedUser();
    setCachedUser(null);
  };

  return {
    session: isOnline ? session : { user: cachedUser },
    isOnline,
    isPending,
    signIn,
    signOut,
    user: isOnline ? session?.user : cachedUser,
  };
}

// Helper functions for caching
async function cacheUserData(user: any) {
  try {
    await SecureStore.setItemAsync('cached_user', JSON.stringify({
      ...user,
      cachedAt: Date.now(),
    }));
  } catch (error) {
    console.error('Failed to cache user data:', error);
  }
}

async function loadCachedUser() {
  try {
    const cached = await SecureStore.getItemAsync('cached_user');
    if (cached) {
      const userData = JSON.parse(cached);
      // Check if cache is still valid (e.g., less than 7 days old)
      const cacheAge = Date.now() - userData.cachedAt;
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
      
      if (cacheAge < maxAge) {
        return userData;
      }
    }
  } catch (error) {
    console.error('Failed to load cached user:', error);
  }
  return null;
}

async function attemptOfflineSignIn(email: string, password: string) {
  const cachedUser = await loadCachedUser();
  
  if (cachedUser && cachedUser.email === email) {
    // In a real app, you'd want to verify the password hash
    // For demo purposes, we'll just check if user exists
    return { data: { user: cachedUser } };
  }
  
  throw new Error('Offline sign-in failed. Please connect to internet.');
}

async function clearCachedUser() {
  try {
    await SecureStore.deleteItemAsync('cached_user');
  } catch (error) {
    console.error('Failed to clear cached user:', error);
  }
}