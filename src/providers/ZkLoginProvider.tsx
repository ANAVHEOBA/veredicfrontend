"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { jwtToAddress, getExtendedEphemeralPublicKey } from "@mysten/sui/zklogin";
import { Transaction } from "@mysten/sui/transactions";
import {
  generateEphemeralKeyPair,
  getEphemeralKeyPair,
  createRandomness,
  getStoredRandomness,
  createNonce,
  storeJwtToken,
  getStoredJwtToken,
  storeUserSalt,
  getStoredUserSalt,
  storeZkProof,
  getStoredZkProof,
  storeUserAddress,
  getStoredUserAddress,
  getStoredMaxEpoch,
  clearZkLoginStorage,
  buildGoogleOAuthUrl,
  decodeJwt,
  fetchSalt,
  fetchZkProof,
} from "@/lib/zklogin";

interface ZkLoginUser {
  address: string;
  email?: string;
  name?: string;
  picture?: string;
  provider: "google";
}

interface ZkLoginContextType {
  user: ZkLoginUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  signAndExecuteTransaction: (tx: Transaction) => Promise<{ digest: string }>;
}

const ZkLoginContext = createContext<ZkLoginContextType | null>(null);

export function useZkLogin() {
  const context = useContext(ZkLoginContext);
  if (!context) {
    throw new Error("useZkLogin must be used within ZkLoginProvider");
  }
  return context;
}

interface ZkLoginProviderProps {
  children: ReactNode;
}

export default function ZkLoginProvider({ children }: ZkLoginProviderProps) {
  const suiClient = useSuiClient();
  const [user, setUser] = useState<ZkLoginUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [keypair, setKeypair] = useState<Ed25519Keypair | null>(null);
  const [zkProof, setZkProof] = useState<object | null>(null);

  // Initialize from stored session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        const storedAddress = getStoredUserAddress();
        const storedProof = getStoredZkProof();
        const storedKeypair = getEphemeralKeyPair();
        const storedJwt = getStoredJwtToken();
        const maxEpoch = getStoredMaxEpoch();

        // Check if session is still valid
        if (storedAddress && storedProof && storedKeypair && maxEpoch) {
          const { epoch } = await suiClient.getLatestSuiSystemState();
          const currentEpoch = Number(epoch);

          if (currentEpoch < maxEpoch) {
            // Session is valid
            setKeypair(storedKeypair);
            setZkProof(storedProof);

            // Get user info from JWT if available
            if (storedJwt) {
              const claims = decodeJwt(storedJwt);
              setUser({
                address: storedAddress,
                email: claims?.email,
                name: claims?.name,
                picture: claims?.picture,
                provider: "google",
              });
            } else {
              setUser({
                address: storedAddress,
                provider: "google",
              });
            }
          } else {
            // Session expired
            clearZkLoginStorage();
          }
        }
      } catch (error) {
        console.error("Error initializing zkLogin session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, [suiClient]);

  // Handle OAuth callback
  useEffect(() => {
    const handleCallback = async () => {
      if (typeof window === "undefined") return;

      // Check for id_token in URL hash
      const hash = window.location.hash;
      if (!hash.includes("id_token")) return;

      setIsLoading(true);

      try {
        // Extract JWT from URL
        const params = new URLSearchParams(hash.slice(1));
        const jwt = params.get("id_token");

        if (!jwt) throw new Error("No id_token found");

        // Store JWT
        storeJwtToken(jwt);

        // Get stored values
        const storedKeypair = getEphemeralKeyPair();
        const randomness = getStoredRandomness();
        const maxEpoch = getStoredMaxEpoch();

        // Debug logging
        console.log("zkLogin callback - stored data:", {
          hasKeypair: !!storedKeypair,
          hasRandomness: !!randomness,
          hasMaxEpoch: !!maxEpoch,
          maxEpoch,
          randomness: randomness?.substring(0, 20) + "...",
        });

        if (!storedKeypair || !randomness || !maxEpoch) {
          throw new Error(`Missing session data: keypair=${!!storedKeypair}, randomness=${!!randomness}, maxEpoch=${!!maxEpoch}`);
        }

        // Fetch salt
        const salt = await fetchSalt(jwt);
        storeUserSalt(salt);

        // Calculate user address
        const claims = decodeJwt(jwt);
        if (!claims) throw new Error("Invalid JWT");

        const address = jwtToAddress(jwt, salt);
        storeUserAddress(address);

        // Fetch ZK proof
        // Get the extended ephemeral public key in the format required by the prover
        const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(storedKeypair.getPublicKey());
        console.log("zkLogin v2 - using getExtendedEphemeralPublicKey:", extendedEphemeralPublicKey.substring(0, 30) + "...");

        const proof = await fetchZkProof(
          jwt,
          extendedEphemeralPublicKey,
          maxEpoch,
          randomness,
          salt
        );
        storeZkProof(proof);

        // Update state
        setKeypair(storedKeypair);
        setZkProof(proof);
        setUser({
          address,
          email: claims.email,
          name: claims.name,
          picture: claims.picture,
          provider: "google",
        });

        // Clean URL
        window.history.replaceState(null, "", window.location.pathname);
      } catch (error) {
        console.error("Error handling zkLogin callback:", error);
        clearZkLoginStorage();
      } finally {
        setIsLoading(false);
      }
    };

    handleCallback();
  }, []);

  const loginWithGoogle = useCallback(async () => {
    setIsLoading(true);

    try {
      // Generate ephemeral keypair
      const newKeypair = generateEphemeralKeyPair();
      setKeypair(newKeypair);

      // Generate randomness
      const randomness = createRandomness();

      // Get current epoch and calculate max epoch (valid for ~24 hours)
      const { epoch } = await suiClient.getLatestSuiSystemState();
      const maxEpoch = Number(epoch) + 2;

      // Generate nonce
      const nonce = createNonce(newKeypair, maxEpoch, randomness);

      // Debug logging - verify data was stored
      console.log("zkLogin pre-redirect - storing data:", {
        keypairStored: !!localStorage.getItem("zklogin_ephemeral_keypair"),
        randomnessStored: !!localStorage.getItem("zklogin_randomness"),
        maxEpochStored: !!localStorage.getItem("zklogin_max_epoch"),
        maxEpoch,
        nonce: nonce.substring(0, 20) + "...",
      });

      // Redirect to Google OAuth
      const oauthUrl = buildGoogleOAuthUrl(nonce);
      window.location.href = oauthUrl;
    } catch (error) {
      console.error("Error initiating Google login:", error);
      setIsLoading(false);
    }
  }, [suiClient]);

  const logout = useCallback(() => {
    clearZkLoginStorage();
    setUser(null);
    setKeypair(null);
    setZkProof(null);
  }, []);

  const signAndExecuteTransaction = useCallback(
    async (tx: Transaction): Promise<{ digest: string }> => {
      if (!keypair || !zkProof || !user) {
        throw new Error("Not authenticated");
      }

      const maxEpoch = getStoredMaxEpoch();
      const salt = getStoredUserSalt();

      if (!maxEpoch || !salt) {
        throw new Error("Missing session data");
      }

      // Set sender
      tx.setSender(user.address);

      // Build transaction
      const { bytes, signature: userSignature } = await tx.sign({
        client: suiClient,
        signer: keypair,
      });

      // Create zkLogin signature
      const zkLoginSignature = {
        inputs: zkProof,
        maxEpoch,
        userSignature,
      };

      // Execute transaction
      const result = await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature: JSON.stringify(zkLoginSignature),
        options: {
          showEffects: true,
        },
      });

      return { digest: result.digest };
    },
    [keypair, zkProof, user, suiClient]
  );

  return (
    <ZkLoginContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        loginWithGoogle,
        logout,
        signAndExecuteTransaction,
      }}
    >
      {children}
    </ZkLoginContext.Provider>
  );
}
