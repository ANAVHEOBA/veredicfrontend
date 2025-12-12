"use client";

import { createContext, useContext, ReactNode } from "react";
import {
  useCurrentAccount,
  useDisconnectWallet,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { useZkLogin } from "./ZkLoginProvider";

export type AuthMethod = "wallet" | "zklogin" | null;

interface AuthUser {
  address: string;
  method: AuthMethod;
  // zkLogin specific
  email?: string;
  name?: string;
  picture?: string;
}

interface AuthContextType {
  // Current user (unified across both auth methods)
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authMethod: AuthMethod;

  // Wallet connection (dApp Kit)
  isWalletConnected: boolean;
  walletAddress: string | null;

  // zkLogin
  isZkLoginAuthenticated: boolean;
  zkLoginUser: {
    address: string;
    email?: string;
    name?: string;
    picture?: string;
  } | null;

  // Actions
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  signAndExecuteTransaction: (tx: Transaction) => Promise<{ digest: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  // dApp Kit hooks (wallet connection)
  const currentAccount = useCurrentAccount();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const { mutateAsync: walletSignAndExecute } = useSignAndExecuteTransaction();

  // zkLogin hooks
  const {
    user: zkUser,
    isLoading: zkLoading,
    isAuthenticated: zkAuthenticated,
    loginWithGoogle,
    logout: zkLogout,
    signAndExecuteTransaction: zkSignAndExecute,
  } = useZkLogin();

  // Determine which auth method is active
  const isWalletConnected = !!currentAccount;
  const isZkLoginAuthenticated = zkAuthenticated;

  // Prioritize wallet connection over zkLogin if both are active
  const authMethod: AuthMethod = isWalletConnected
    ? "wallet"
    : isZkLoginAuthenticated
    ? "zklogin"
    : null;

  // Build unified user object
  const user: AuthUser | null = isWalletConnected
    ? {
        address: currentAccount.address,
        method: "wallet",
      }
    : isZkLoginAuthenticated && zkUser
    ? {
        address: zkUser.address,
        method: "zklogin",
        email: zkUser.email,
        name: zkUser.name,
        picture: zkUser.picture,
      }
    : null;

  // Unified logout
  const logout = () => {
    if (isWalletConnected) {
      disconnectWallet();
    }
    if (isZkLoginAuthenticated) {
      zkLogout();
    }
  };

  // Unified sign and execute
  const signAndExecuteTransaction = async (
    tx: Transaction
  ): Promise<{ digest: string }> => {
    if (isWalletConnected) {
      const result = await walletSignAndExecute({
        transaction: tx,
      });
      return { digest: result.digest };
    }

    if (isZkLoginAuthenticated) {
      return zkSignAndExecute(tx);
    }

    throw new Error("Not authenticated");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading: zkLoading,
        authMethod,

        isWalletConnected,
        walletAddress: currentAccount?.address || null,

        isZkLoginAuthenticated,
        zkLoginUser: zkUser,

        loginWithGoogle,
        logout,
        signAndExecuteTransaction,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
